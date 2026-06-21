"""Selects the embedding client based on configuration."""

from config import Settings, get_settings

from .base import EmbeddingClient
from .mock_embeddings import MockEmbeddingClient


def build_embedding_client(settings: Settings | None = None) -> EmbeddingClient:
    """Return a live Gemini client in live mode, otherwise the offline mock.

    The live client is imported lazily so the google-genai dependency is only
    required when actually running against the API.
    """
    settings = settings or get_settings()
    if settings.is_live:
        from .gemini_embeddings import GeminiEmbeddingClient

        return GeminiEmbeddingClient(settings)
    return MockEmbeddingClient()
