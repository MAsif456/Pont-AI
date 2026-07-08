"""Tests for ranking and the low-confidence human-review flag."""

from agents.ranking import rank_candidates
from models.needs import NeedsProfile
from models.service import RetrievedService, Service


def _candidate(service_id: str, distance: float) -> RetrievedService:
    service = Service(
        service_id=service_id,
        name=f"Service {service_id}",
        category="home care",
        description="A description. With detail.",
        eligibility_criteria="Adults with dementia.",
        phone="029 2000 0000",
        address="1 Test Street, Cardiff CF10 1AA",
    )
    return RetrievedService(service=service, distance=distance)


def test_recommendations_are_enriched_with_contacts(mock_llm):
    recommendations = rank_candidates(
        mock_llm, NeedsProfile(dementia_stage="mild"), [], [_candidate("SVC-1", 0.2)], None, None,
    )
    assert recommendations[0].phone == "029 2000 0000"
    assert "Cardiff" in recommendations[0].address


def test_low_confidence_is_flagged_for_review(mock_llm):
    candidates = [_candidate(f"SVC-{i}", 0.2 + i * 0.1) for i in range(5)]
    recommendations = rank_candidates(
        mock_llm, NeedsProfile(dementia_stage="moderate", key_risks=["falls risk"]),
        [], candidates, None, None,
    )
    assert len(recommendations) == 5
    low = [rec for rec in recommendations if rec.confidence == "low"]
    assert low, "expected at least one low-confidence recommendation"
    assert all(rec.recommended_for_human_review for rec in low)


def test_top_recommendation_is_high_confidence(mock_llm):
    candidates = [_candidate(f"SVC-{i}", 0.2 + i * 0.1) for i in range(3)]
    recommendations = rank_candidates(
        mock_llm, NeedsProfile(dementia_stage="mild"), [], candidates, None, None,
    )
    assert recommendations[0].rank == 1
    assert recommendations[0].confidence == "high"
    assert recommendations[0].recommended_for_human_review is False


def test_no_candidates_yields_no_recommendations(mock_llm):
    assert rank_candidates(mock_llm, NeedsProfile(), [], [], None, None) == []
