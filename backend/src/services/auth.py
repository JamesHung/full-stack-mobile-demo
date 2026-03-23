import base64
import hashlib
import hmac
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import Header
from pydantic import BaseModel, EmailStr

from backend.src.exceptions.errors import AuthenticationError
from backend.src.services.database import session
from backend.src.settings.config import get_settings


class DemoLoginRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    displayName: str


class AuthSessionResponse(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    user: UserResponse


def _sign_token(user_id: str) -> str:
    secret = get_settings().demo_auth_secret.encode()
    digest = hmac.new(secret, user_id.encode(), hashlib.sha256).hexdigest()
    payload = f"{user_id}:{digest}"
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _unsign_token(token: str) -> str:
    try:
        payload = base64.urlsafe_b64decode(token.encode()).decode()
        user_id, digest = payload.split(":", 1)
    except Exception as exc:  # pragma: no cover - defensive parsing
        raise AuthenticationError("Invalid access token.") from exc

    expected = hmac.new(
        get_settings().demo_auth_secret.encode(),
        user_id.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, digest):
        raise AuthenticationError("Invalid access token.")

    return user_id


def ensure_demo_user(email: str) -> UserResponse:
    settings = get_settings()
    with session() as connection:
        row = connection.execute(
            "SELECT id, email, display_name FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if row is None:
            user_id = str(uuid4())
            created_at = datetime.now(UTC).isoformat()
            connection.execute(
                """
                INSERT INTO users (id, email, display_name, auth_provider, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, email, settings.demo_user_name, "demo", created_at),
            )
            row = {"id": user_id, "email": email, "display_name": settings.demo_user_name}

    return UserResponse(id=row["id"], email=row["email"], displayName=row["display_name"])


def create_demo_session(request: DemoLoginRequest) -> AuthSessionResponse:
    user = ensure_demo_user(str(request.email))
    return AuthSessionResponse(accessToken=_sign_token(user.id), user=user)


def get_current_user(authorization: str | None = Header(default=None)) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("Missing bearer token.")

    user_id = _unsign_token(authorization.removeprefix("Bearer ").strip())
    with session() as connection:
        row = connection.execute(
            "SELECT id, email, display_name FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            raise AuthenticationError("User not found.")

    return UserResponse(id=row["id"], email=row["email"], displayName=row["display_name"])
