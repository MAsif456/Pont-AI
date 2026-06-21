"""Common interface for embedding clients.

Defining a Protocol keeps the vector store and retrieval code decoupled from
whether embeddings come from a deterministic mock or live Gemini -- callers only
depend on this shape.
"""

from typing import Protocol


class EmbeddingClient(Protocol):
    """Turns text into fixed-length numeric vectors for similarity search."""

    def embed(
        self, texts: list[str], task_type: str | None = None
    ) -> list[list[float]]:
        """Return one embedding vector per input text, in the same order.

        ``task_type`` is an optional retrieval hint (e.g. ``RETRIEVAL_DOCUMENT``
        when indexing, ``RETRIEVAL_QUERY`` when searching). Clients that cannot
        use it ignore it.
        """
        ...
