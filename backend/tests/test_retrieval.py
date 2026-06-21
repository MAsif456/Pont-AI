"""Tests for the vector store and the search_services tool."""

from tools.search_services import search_services


def test_query_returns_requested_count(ingested_store):
    hits = ingested_store.query("respite for an exhausted carer", top_k=5)
    assert len(hits) == 5
    # Distances should be sorted ascending (closest first).
    assert hits == sorted(hits, key=lambda h: h.distance)


def test_category_filter_restricts_results(ingested_store):
    hits = ingested_store.query("a break for the carer", top_k=5, category="respite care")
    assert hits
    assert all(hit.service.category == "respite care" for hit in hits)


def test_search_services_postcode_filter(ingested_store):
    # Grangetown hub only covers CF10/CF11/CF24, so a CF14 filter should drop it.
    hits = search_services(
        ingested_store, "community dementia hub drop-in", category="day centre",
        postcode_area="CF14",
    )
    assert all("CF14" in hit.service.postcode_coverage for hit in hits)


def test_search_services_without_filters(ingested_store):
    hits = search_services(ingested_store, "falls risk living alone")
    assert 1 <= len(hits) <= 5
