"""Health-check endpoint used to confirm the service is running."""

from fastapi import APIRouter

from config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Report liveness and which LLM mode the server is using.

    Surfacing ``llm_mode`` makes it obvious at a glance whether the server is in
    offline mock mode or wired to live Gemini, which avoids confusing demos.
    """
    settings = get_settings()
    return {"status": "ok", "llm_mode": settings.llm_mode}
