"""Application configuration loaded from environment variables.

Centralising settings here keeps secret handling in one place: nothing reads
``os.environ`` directly elsewhere, so the live API key only ever flows through
this module.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to the backend package root, used to locate bundled data files
# regardless of the directory the server is launched from.
BACKEND_ROOT = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """Strongly-typed application settings with sensible prototype defaults."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # "mock" keeps the whole app runnable (and testable) without any API key.
    llm_mode: str = Field(default="mock", alias="PONT_LLM_MODE")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    generation_model: str = Field(
        default="gemini-2.5-flash", alias="PONT_GENERATION_MODEL"
    )
    embedding_model: str = Field(
        default="gemini-embedding-001", alias="PONT_EMBEDDING_MODEL"
    )

    cors_origins: str = Field(
        default="http://localhost:3000", alias="PONT_CORS_ORIGINS"
    )

    @property
    def is_live(self) -> bool:
        """Whether real Gemini calls should be made."""
        return self.llm_mode.strip().lower() == "live"

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins split into a list for FastAPI middleware."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def data_dir(self) -> Path:
        return BACKEND_ROOT / "data"

    @property
    def chroma_dir(self) -> Path:
        # Namespaced by mode: live and mock embeddings have different vector sizes,
        # so they must not share a collection. Switching mode uses its own store.
        return self.data_dir / "chroma" / self.llm_mode.strip().lower()


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance.

    Cached so the ``.env`` file is parsed once per process; tests clear this
    cache when they need to exercise a different configuration.
    """
    return Settings()
