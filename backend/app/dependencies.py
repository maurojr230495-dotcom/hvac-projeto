from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth import decode_token, is_token_revoked

bearer = HTTPBearer()


def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
    except JWTError:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise credentials_exception

    return user


# Public alias
get_current_user = _get_current_user


def require_roles(*roles: UserRole):
    """Factory: returns a dependency that enforces one of the given roles."""
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in roles]}",
            )
        return user
    return _check


# Convenience shortcuts
require_admin       = require_roles(UserRole.ADMIN)
require_manager     = require_roles(UserRole.ADMIN, UserRole.MANAGER)
require_dispatcher  = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.DISPATCHER)
require_technician  = require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.DISPATCHER, UserRole.TECHNICIAN)
