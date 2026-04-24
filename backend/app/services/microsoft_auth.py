"""
Microsoft Entra ID (Azure AD) OAuth2/OIDC integration.

Flow:
  1. GET /auth/microsoft/login  → redirect to Microsoft authorization URL
  2. Microsoft redirects back to /auth/microsoft/callback?code=...&state=...
  3. Exchange code for tokens, fetch user profile from Graph API
  4. Create or update local User record, issue our own JWT pair
"""
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User, AuthProvider, UserRole
from app.services.auth import hash_password


AUTHORITY = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}"
SCOPES = ["openid", "profile", "email", "User.Read"]


def get_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.AZURE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.AZURE_REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "response_mode": "query",
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTHORITY}/oauth2/v2.0/authorize?{query}"


async def exchange_code_for_token(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTHORITY}/oauth2/v2.0/token",
            data={
                "client_id": settings.AZURE_CLIENT_ID,
                "client_secret": settings.AZURE_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.AZURE_REDIRECT_URI,
                "scope": " ".join(SCOPES),
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_microsoft_user_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


def get_or_create_microsoft_user(db: Session, profile: dict) -> User:
    """
    Find user by microsoft_id or email; create if new.
    Never overwrites password — local auth remains intact if user existed.
    """
    microsoft_id = profile.get("id")
    email = profile.get("mail") or profile.get("userPrincipalName", "")
    name = profile.get("displayName", email)

    user = db.query(User).filter(User.microsoft_id == microsoft_id).first()
    if user:
        return user

    user = db.query(User).filter(User.email == email).first()
    if user:
        # Link existing local account to Microsoft
        user.microsoft_id = microsoft_id
        user.auth_provider = AuthProvider.MICROSOFT
        db.commit()
        db.refresh(user)
        return user

    # New user — default role TECHNICIAN, admin can promote later
    user = User(
        name=name,
        email=email,
        microsoft_id=microsoft_id,
        auth_provider=AuthProvider.MICROSOFT,
        role=UserRole.TECHNICIAN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
