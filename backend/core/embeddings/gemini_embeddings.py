"""Live embedding client backed by Google Gemini text-embedding models."""

from google import genai
from google.genai import types

from config import Settings
from core.retry import call_with_retry


class GeminiEmbeddingClient:
    """Embeds text via the Gemini embedding API (Google AI Studio)."""

    def __init__(self, settings: Settings) -> None:
        # Fail fast with a clear message rather than a confusing API error later.
        if not settings.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is required when PONT_LLM_MODE=live. "
                "Set it in backend/.env or switch PONT_LLM_MODE back to 'mock'."
            )
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.embedding_model

    def embed(
        self, texts: list[str], task_type: str | None = None
    ) -> list[list[float]]:
        """Return one embedding per text using a single batched API call.

        Passing a ``task_type`` (``RETRIEVAL_DOCUMENT`` when indexing,
        ``RETRIEVAL_QUERY`` when searching) lets Gemini produce asymmetric
        embeddings tuned for retrieval, which sharpens match quality.
        """
        if not texts:
            return []
        config = types.EmbedContentConfig(task_type=task_type) if task_type else None
        response = call_with_retry(
            lambda: self._client.models.embed_content(
                model=self._model, contents=texts, config=config
            )
        )
        return [list(embedding.values) for embedding in response.embeddings]
