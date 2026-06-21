"""Manual retrieval-quality check for the vector store (Step 3 gate).

Prints the top-5 services for a set of representative queries so retrieval
quality can be eyeballed before building the downstream pipeline. Run after
ingestion:

    python scripts/test_retrieval.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.vector_store import VectorStore  # noqa: E402

# Queries chosen to probe distinct needs the matcher will encounter in practice.
SAMPLE_QUERIES = [
    "patient with moderate dementia, lives alone, falls risk, no carer",
    "exhausted family carer needs a break and respite",
    "severe dementia, unsafe at home, urgent crisis, recently discharged",
    "early stage dementia, independent, wants information and social contact",
    "night-time wandering, tries to leave the house after dark",
]


def main() -> None:
    store = VectorStore()
    if store.count() == 0:
        print("Vector store is empty -- run scripts/ingest_services.py first.")
        return

    for query in SAMPLE_QUERIES:
        print(f"\nQUERY: {query}")
        for rank, hit in enumerate(store.query(query, top_k=5), start=1):
            print(
                f"  {rank}. [{hit.distance:.3f}] {hit.service.name} "
                f"({hit.service.category})"
            )


if __name__ == "__main__":
    main()
