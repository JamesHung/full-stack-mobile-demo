from fastapi import APIRouter

from backend.src.services.auth import AuthSessionResponse, DemoLoginRequest, create_demo_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/demo-login",
    response_model=AuthSessionResponse,
    summary="Demo login",
    description="Exchange a demo login request for a bearer token and seeded user profile.",
)
def demo_login(payload: DemoLoginRequest) -> AuthSessionResponse:
    return create_demo_session(payload)
