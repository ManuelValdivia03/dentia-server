from fastapi import Depends, Header, HTTPException, status
import jwt

from app.core.config import settings


def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    return payload


def normalize_user_roles(current_user: dict) -> set[str]:
    role = current_user.get("role")
    roles = current_user.get("roles", [])

    normalized_roles = set()

    if isinstance(role, str):
        normalized_roles.add(role.lower())

    if isinstance(roles, list):
        normalized_roles.update(str(r).lower() for r in roles)

    return normalized_roles


def require_roles(*allowed_roles: str):
    def dependency(current_user: dict = Depends(get_current_user)):
        normalized_roles = normalize_user_roles(current_user)
        allowed = set(r.lower() for r in allowed_roles)

        if not normalized_roles.intersection(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return dependency


def resolve_doctor_scope(current_user: dict, requested_doctor_id: str | None):
    roles = normalize_user_roles(current_user)

    if "admin" in roles:
        return requested_doctor_id

    if "dentist" in roles:
        dentist_id = current_user.get("domainId")

        if not dentist_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dentist domainId is required",
            )

        if requested_doctor_id and requested_doctor_id != dentist_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Dentists can only access their own reports",
            )

        return dentist_id

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions",
    )


def require_internal_key(x_internal_api_key: str = Header(...)):
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )

    return True