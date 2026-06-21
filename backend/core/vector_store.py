"""Persistent ChromaDB vector store for the Cardiff service directory.

Embeddings are computed by our own :class:`EmbeddingClient` (mock or Gemini) and
passed in explicitly, so Chroma is used purely as a similarity index. This keeps
the embedding choice in one place and avoids Chroma's default embedding model.
"""

from pathlib import Path

import chromadb

from config import Settings, get_settings
from models.service import RetrievedService, Service

from .embeddings.base import EmbeddingClient
from .embeddings.factory import build_embedding_client

COLLECTION_NAME = "cardiff_services"


class VectorStore:
    """Thin wrapper around a persistent Chroma collection of services."""

    def __init__(
        self,
        settings: Settings | None = None,
        embedding_client: EmbeddingClient | None = None,
        persist_path: str | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._embedder = embedding_client or build_embedding_client(self._settings)
        # An explicit path lets tests use an isolated temporary store instead of
        # the shared mode-namespaced directory.
        chroma_dir = persist_path or str(self._settings.chroma_dir)
        Path(chroma_dir).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=chroma_dir)
        # Cosine distance suits normalised text embeddings better than the default L2.
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )

    def reset(self) -> None:
        """Drop and recreate the collection so ingestion starts from clean state."""
        self._client.delete_collection(COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )

    def add_services(self, services: list[Service]) -> None:
        """Embed and store a batch of services with their full record as metadata."""
        if not services:
            return
        embeddings = self._embedder.embed(
            [svc.embedding_text() for svc in services], task_type="RETRIEVAL_DOCUMENT"
        )
        self._collection.add(
            ids=[svc.service_id for svc in services],
            embeddings=embeddings,
            documents=[svc.embedding_text() for svc in services],
            # Category is duplicated out of the JSON blob to allow metadata filtering.
            metadatas=[
                {"category": svc.category, "service_json": svc.model_dump_json()}
                for svc in services
            ],
        )

    def count(self) -> int:
        """Number of services currently stored."""
        return self._collection.count()

    def query(
        self, text: str, top_k: int = 5, category: str | None = None
    ) -> list[RetrievedService]:
        """Return the ``top_k`` services most similar to ``text``.

        An optional ``category`` restricts the search to one service category,
        which the agentic retrieval loop uses for targeted per-category queries.
        """
        query_embedding = self._embedder.embed([text], task_type="RETRIEVAL_QUERY")[0]
        where = {"category": category} if category else None
        result = self._collection.query(
            query_embeddings=[query_embedding], n_results=top_k, where=where
        )
        return self._to_retrieved(result)

    @staticmethod
    def _to_retrieved(result: dict) -> list[RetrievedService]:
        """Convert Chroma's nested query result into typed objects."""
        # Chroma nests results one level per query; we only ever issue a single query.
        metadatas = result.get("metadatas") or [[]]
        distances = result.get("distances") or [[]]
        retrieved: list[RetrievedService] = []
        for metadata, distance in zip(metadatas[0], distances[0], strict=False):
            service = Service.model_validate_json(metadata["service_json"])
            retrieved.append(RetrievedService(service=service, distance=float(distance)))
        return retrieved
