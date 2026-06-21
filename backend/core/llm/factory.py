"""Selects the language-model client based on configuration."""

from config import Settings, get_settings

from .base import LLMClient


def build_llm_client(settings: Settings | None = None) -> LLMClient:
    """Return a live Gemini client in live mode, otherwise the offline mock.

    The live client is imported lazily so google-genai is only required when
    actually calling the API.
    """
    settings = settings or get_settings()
    if settings.is_live:
        from .gemini_client import GeminiLLMClient

        return GeminiLLMClient(settings)
    from .mock import MockLLMClient

    return MockLLMClient()
