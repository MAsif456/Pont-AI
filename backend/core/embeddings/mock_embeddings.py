"""Deterministic offline embeddings based on hashed bag-of-words.

A purely random hash embedding would make retrieval meaningless, so instead we
feature-hash the significant words of each text into a fixed-length vector and
L2-normalise it. Cosine similarity then reflects genuine lexical overlap, which
is good enough to demonstrate and test retrieval quality without any API key.
"""

import hashlib
import math
import re

# Dimensionality of the mock vectors. Large enough to keep hash collisions rare
# across our small service vocabulary, small enough to stay fast.
_DIMENSIONS = 256

# Common words carry little matching signal; dropping them sharpens similarity.
_STOPWORDS = frozenset(
    {
        "a", "an", "the", "and", "or", "of", "to", "for", "with", "in", "on",
        "at", "by", "is", "are", "be", "as", "who", "that", "this", "their",
        "they", "from", "not", "no", "can", "may", "has", "have", "such",
        "where", "which", "would", "should", "per", "up", "out", "any",
    }
)

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def _tokenise(text: str) -> list[str]:
    """Lowercase, split into word tokens and drop stopwords and very short words."""
    tokens = _TOKEN_PATTERN.findall(text.lower())
    return [token for token in tokens if token not in _STOPWORDS and len(token) > 2]


def _hash_to_index(token: str) -> int:
    """Map a token to a stable vector index via a content hash.

    A content hash (rather than Python's randomised ``hash``) keeps embeddings
    identical across processes, so an ingested store stays queryable later.
    """
    digest = hashlib.md5(token.encode("utf-8")).hexdigest()
    return int(digest, 16) % _DIMENSIONS


def _embed_one(text: str) -> list[float]:
    """Build a single L2-normalised term-frequency vector for one text."""
    vector = [0.0] * _DIMENSIONS
    for token in _tokenise(text):
        vector[_hash_to_index(token)] += 1.0

    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0.0:
        # Empty or all-stopword text: return the zero vector rather than dividing by zero.
        return vector
    return [value / magnitude for value in vector]


class MockEmbeddingClient:
    """Offline embedding client used when ``PONT_LLM_MODE`` is not ``live``."""

    def embed(
        self, texts: list[str], task_type: str | None = None
    ) -> list[list[float]]:
        # task_type is irrelevant to lexical hashing; accepted for interface parity.
        return [_embed_one(text) for text in texts]
