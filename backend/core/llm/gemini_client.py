"""Live language-model client backed by Google Gemini (AI Studio)."""

from google import genai
from google.genai import types

from config import Settings
from core.retry import call_with_retry


class GeminiLLMClient:
    """Generates JSON completions via the Gemini generate-content API."""

    def __init__(self, settings: Settings) -> None:
        # Fail fast with an actionable message rather than a deep API error later.
        if not settings.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is required when PONT_LLM_MODE=live. "
                "Set it in backend/.env or switch PONT_LLM_MODE back to 'mock'."
            )
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.generation_model

    def generate(self, prompt: str) -> str:
        """Return Gemini's response, constrained to JSON output.

        A low temperature and a JSON response type make parsing reliable, which
        matters because every downstream step consumes structured output.
        """
        response = call_with_retry(
            lambda: self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
        )
        return response.text or ""
