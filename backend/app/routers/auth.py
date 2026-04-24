import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    is_token_revoked,
    revoke_token,
)
from app.services.microsoft_auth import (
    exchange_code_for_token,
    get_authorization_url,
    get_microsoft_user_profile,
    get_or_create_microsoft_user,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)

_ms_state_store: dict[str, str] = {}  # state → redirect_uri (ephemeral, single-instance)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    from jose import JWTError

    try:
        payload = decode_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a refresh token")

    if is_token_revoked(body.refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

    from app.models.user import User

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate: revoke old, issue new pair
    revoke_token(body.refresh_token)
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout")
def logout(body: RefreshRequest):
    revoke_token(body.refresh_token)
    return {"detail": "Logged out"}


# ── Microsoft Entra ID ──────────────────────────────────────────────────────

@router.get("/microsoft/login")
def microsoft_login():
    if not settings.AZURE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Microsoft auth not configured")
    state = secrets.token_urlsafe(16)
    _ms_state_store[state] = state
    return RedirectResponse(get_authorization_url(state))


@router.get("/microsoft/callback")
async def microsoft_callback(code: str, state: str, db: Session = Depends(get_db)):
    if state not in _ms_state_store:
        raise HTTPException(status_code=400, detail="Invalid state")
    _ms_state_store.pop(state, None)

    tokens = await exchange_code_for_token(code)
    profile = await get_microsoft_user_profile(tokens["access_token"])
    user = get_or_create_microsoft_user(db, profile)

    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id)

    # In a real SPA you'd redirect to frontend with tokens in query or cookie
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}
