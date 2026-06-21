"""Shared pytest fixtures.

Tests are forced into mock mode (no API key, no network) regardless of any local
``.env``, and use an isolated temporary vector store ingested with mock
embeddings so they never depend on a pre-ingested directory.
"""

import os

import pytest

# Force offline mock mode before anything imports the cached settings. An OS env
# var takes precedence over the .env file in pydantic-settings.
os.environ["PONT_LLM_MODE"] = "mock"

from config import get_settings  # noqa: E402
from core.data_loader import load_patients, load_services  # noqa: E402
from core.llm.mock import MockLLMClient  # noqa: E402
from core.vector_store import VectorStore  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    """Ensure each test sees mock-mode settings even if another test changed env."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def mock_llm() -> MockLLMClient:
    return MockLLMClient()


@pytest.fixture(scope="session")
def ingested_store(tmp_path_factory) -> VectorStore:
    """A temporary vector store ingested once with the real service directory."""
    path = tmp_path_factory.mktemp("chroma")
    store = VectorStore(persist_path=str(path))
    store.reset()
    store.add_services(load_services())
    return store


@pytest.fixture
def patients() -> list[dict]:
    return load_patients()


@pytest.fixture
def conflict_patient_ids() -> set[str]:
    """Patient ids whose source notes were deliberately written to disagree."""
    return {"PT-001", "PT-002", "PT-003", "PT-008", "PT-011"}
