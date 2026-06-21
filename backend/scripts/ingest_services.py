"""Embed the Cardiff service directory into the persistent vector store.

Run from the backend directory after configuring the desired PONT_LLM_MODE:

    python scripts/ingest_services.py

In mock mode this uses offline embeddings (no API key). In live mode it calls
the Gemini embedding API. The collection is reset first so re-running is safe.
"""

import sys
from pathlib import Path

# Allow running as a plain script (``python scripts/ingest_services.py``) by
# putting the backend root on the path before importing local modules.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings  # noqa: E402
from core.data_loader import load_services  # noqa: E402
from core.vector_store import VectorStore  # noqa: E402


def main() -> None:
    settings = get_settings()
    services = load_services()
    store = VectorStore(settings)
    store.reset()
    store.add_services(services)
    print(
        f"Ingested {store.count()} services into {settings.chroma_dir} "
        f"(mode={settings.llm_mode})."
    )


if __name__ == "__main__":
    main()
