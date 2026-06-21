"""Common interface for language-model clients.

Every model call in the system goes through this single ``generate`` method, so
swapping the mock for live Gemini (or, later, Vertex) never touches callers.
"""

from typing import Protocol


class LLMClient(Protocol):
    """Generates a text completion (expected to be JSON) for a prompt."""

    def generate(self, prompt: str) -> str:
        """Return the model's raw text response for ``prompt``."""
        ...
