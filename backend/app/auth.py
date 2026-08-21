from fastapi import Header, HTTPException, status
import jwt
from jwt import PyJWTError
from app.config import settings


class CurrentUser:
    def __init__(self, user_id: str, email: str | None, token: str):
        self.id = user_id
        self.email = email
        self.token = token  # raw JWT, needed to build an RLS-scoped client


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    """
    Expects: Authorization: Bearer <supabase_access_token>
    Verifies the token's signature against the Supabase JWT secret so we
    never trust a user_id sent from the client directly.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    return CurrentUser(user_id=user_id, email=email, token=token)
