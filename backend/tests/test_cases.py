"""Tests for the case store and its persistence behaviour."""

import pytest

from agents.social_care_agent import SocialCareAgent
from core.case_store import CaseStore
from core.report_generator import generate_report
from models.api import RunAgentRequest


@pytest.fixture
def built(mock_llm, ingested_store):
    """Produce a real (agent_result, report) pair for a patient."""
    def _build(patient_id: str):
        agent = SocialCareAgent(mock_llm, ingested_store)
        result = agent.run(RunAgentRequest(patient_id=patient_id))
        report = generate_report(mock_llm, result, patient_name=patient_id)
        return result, report
    return _build


@pytest.fixture
def store(tmp_path) -> CaseStore:
    return CaseStore(path=tmp_path / "cases.json")


def test_add_and_list_case(store, built):
    result, report = built("PT-001")
    case_id, _ = store.add_assessment("PT-001", "Gwendoline Pritchard", result, report)
    summaries = store.list_summaries()
    assert len(summaries) == 1
    summary = summaries[0]
    assert summary.case_id == case_id
    assert summary.patient_name == "Gwendoline Pritchard"
    assert summary.status == "pending_review"
    assert summary.top_service  # PT-001 yields recommendations
    assert summary.discrepancy_count >= 1


def test_same_patient_accumulates_history(store, built):
    result, report = built("PT-001")
    store.add_assessment("PT-001", "Gwendoline Pritchard", result, report)
    store.add_assessment("PT-001", "Gwendoline Pritchard", result, report)
    summaries = store.list_summaries()
    assert len(summaries) == 1
    assert summaries[0].assessment_count == 2


def test_raw_intakes_create_separate_cases(store, built):
    result, report = built("PT-004")
    store.add_assessment(None, "Walk-in A", result, report)
    store.add_assessment(None, "Walk-in B", result, report)
    assert len(store.list_summaries()) == 2


def test_update_status_and_persist(store, built):
    result, report = built("PT-003")
    case_id, _ = store.add_assessment("PT-003", "Beryl Watkins", result, report)
    updated = store.update_latest_status(case_id, "approved", note="Looks right")
    assert updated.latest.status == "approved"
    # A fresh store reading the same file must see the persisted change.
    assert CaseStore(path=store._path).get(case_id).latest.status == "approved"


def test_update_unknown_case_returns_none(store):
    assert store.update_latest_status("nope", "approved") is None


def test_stats_counts(store, built):
    store.add_assessment("PT-001", "A", *built("PT-001"))  # has discrepancy
    case_id, _ = store.add_assessment("PT-004", "B", *built("PT-004"))  # no discrepancy
    store.update_latest_status(case_id, "approved")
    stats = store.stats()
    assert stats.total_cases == 2
    assert stats.pending_review == 1
    assert stats.approved == 1
    assert stats.discrepancies_flagged == 1
    assert stats.assessed_this_month == 2
