"""Tool: search_services -- find Cardiff services relevant to a query.

MCP manifest entry:
    name: search_services
    description: Search the Cardiff service directory (vector store) for services
                 matching a free-text query, optionally narrowed by category and
                 postcode coverage area.
    parameters:
        query (string, required): natural-language description of the need
        category (string, optional): restrict to one service category
        postcode_area (string, optional): keep only services covering this area
"""

from core.vector_store import VectorStore
from models.service import RetrievedService


def search_services(
    store: VectorStore,
    query: str,
    category: str | None = None,
    postcode_area: str | None = None,
    top_k: int = 5,
) -> list[RetrievedService]:
    """Return services matching ``query``, filtered by category and postcode.

    Category filtering happens inside the vector store; postcode filtering is a
    post-filter because a service covers several areas and coverage is advisory
    rather than a hard exclusion for ranking.
    """
    hits = store.query(query, top_k=top_k, category=category)
    if postcode_area:
        hits = [hit for hit in hits if _covers(hit, postcode_area)]
    return hits


def _covers(hit: RetrievedService, postcode_area: str) -> bool:
    """Whether a service covers the given Cardiff postcode area (case-insensitive)."""
    area = postcode_area.strip().upper()
    return any(area == covered.strip().upper() for covered in hit.service.postcode_coverage)
