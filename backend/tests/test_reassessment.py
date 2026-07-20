"""Tests for clinical updates and reactive reassessment."""

import json
import shutil
import warnings

import pytest
from fastapi.testclient import TestClient

from agents.intake import resolve_input
from agents.social_care_agent import SocialCareAgent
from config import BACKEND_ROOT
from core.case_store import CaseStore
from core.clinical_update_store import ClinicalUpdateStore
from core.interaction_store import InteractionStore
from core.reassessment import assess_update_impact
from core.referral_store import ReferralStore
from main import app
from models.api import RunAgentRequest
from models.context import ClinicalUpdate
from models.patient import SourceNoteInput
from routers.dependencies import (
    get_agent,
    get_case_store,
    get_clinical_update_store,
    get_interaction_store,
    get_llm,
    get_referral_store,
    get_vector_store,
)

warnings.filterwarnings("ignore")

_CLINICAL_SRC = BACKEND_ROOT / "data" / "clinical_context.json"


# --- Store and impact unit tests ---


@pytest.fixture
def clinical_store(tmp_path) -> ClinicalUpdateStore:
    path = tmp_path / "clinical_context.json"
    path.write_text(
        json.dumps([{"patient_id": "PT-T", "diagnosis_summary": "Dementia"}]),
        encoding="utf-8",
    )
    return ClinicalUpdateStore(path=path)


def test_add_update_appends_without_overwriting(clinical_store):
    context = clinical_store.add_update(
        "PT-T", field_changed="mobility", new_value="walking frame",
        previous_value="independent", source="OT",
    )
    assert context.diagnosis_summary == "Dementia"  # snapshot preserved
    assert len(context.clinical_updates) == 1
    assert clinical_store.add_update("missing", "x", "y", "", "Nurse") is None


def test_updates_since_filters_by_timestamp(clinical_store):
    clinical_store.add_update(
        "PT-T", "medication", "v1", "", "Nurse", timestamp="2026-01-01T00:00:00+00:00"
    )
    clinical_store.add_update(
        "PT-T", "medication", "v2", "", "Nurse", timestamp="2026-03-01T00:00:00+00:00"
    )
    assert len(clinical_store.updates_since("PT-T", None)) == 2
    recent = clinical_store.updates_since("PT-T", "2026-02-01T00:00:00+00:00")
    assert len(recent) == 1
    assert recent[0].new_value == "v2"


def _update(field: str, value: str) -> ClinicalUpdate:
    return ClinicalUpdate(
        update_id="u1", timestamp="2026-06-01T00:00:00+00:00",
        field_changed=field, new_value=value, source="Ward Nurse",
    )


def test_impact_significant_change_recommends_rerun(mock_llm):
    impact = assess_update_impact(mock_llm, {}, [_update("medication", "increased to twice daily")])
    assert impact.affects_discharge is True
    assert impact.recommend_rerun is True


def test_impact_minor_change_holds(mock_llm):
    update = _update("ward observation", "in good spirits today")
    impact = assess_update_impact(mock_llm, {}, [update])
    assert impact.affects_discharge is False
    assert impact.recommend_rerun is False


def test_impact_folds_significant_family_note(mock_llm):
    """A family note carrying a decline signal warrants a re-run on its own."""
    note = "Family/Carer: had a fall, can no longer manage stairs"
    impact = assess_update_impact(mock_llm, {}, [], interaction_notes=[note])
    assert impact.affects_discharge is True
    assert impact.recommend_rerun is True


def test_resolve_input_appends_extra_source_notes():
    """Notes from other actors are folded into the agent's source notes on re-run."""
    request = RunAgentRequest(
        patient_id="PT-001",
        extra_source_notes=[SourceNoteInput(source="Family/Carer", text="had a fall at home")],
    )
    resolved = resolve_input(request)
    texts = [note.text for note in resolved.source_notes]
    assert "had a fall at home" in texts


# --- API tests ---


@pytest.fixture
def client(mock_llm, ingested_store, tmp_path):
    clinical_path = tmp_path / "clinical_context.json"
    shutil.copy(_CLINICAL_SRC, clinical_path)
    app.dependency_overrides[get_llm] = lambda: mock_llm
    app.dependency_overrides[get_vector_store] = lambda: ingested_store
    app.dependency_overrides[get_agent] = lambda: SocialCareAgent(mock_llm, ingested_store)
    app.dependency_overrides[get_case_store] = lambda: CaseStore(path=tmp_path / "cases.json")
    app.dependency_overrides[get_referral_store] = lambda: ReferralStore(
        path=tmp_path / "referrals.json"
    )
    app.dependency_overrides[get_clinical_update_store] = lambda: ClinicalUpdateStore(
        path=clinical_path
    )
    app.dependency_overrides[get_interaction_store] = lambda: InteractionStore(
        path=tmp_path / "interactions.json"
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_clinical_update_endpoint(client):
    response = client.post(
        "/clinical-updates/PT-001",
        json={"field_changed": "mobility", "new_value": "walking frame", "source": "OT"},
    )
    assert response.status_code == 200
    assert len(response.json()["clinical_updates"]) == 1
    assert client.get("/clinical-updates/PT-001").json()["clinical_updates"]
    assert client.post("/clinical-updates/PT-999", json={
        "field_changed": "x", "new_value": "y", "source": "Nurse"}).status_code == 404


def _assessed_referral(client) -> str:
    """Create a referral for PT-001 and run it through to report_ready."""
    referral_id = client.post("/referrals", json={
        "patient_name": "Gwendoline", "patient_id": "PT-001", "source": "ward_nursing",
        "reason_for_referral": "Dementia with falls, needs support at home.",
    }).json()["referral_id"]
    client.post(f"/referrals/{referral_id}/screen")
    client.post(f"/referrals/{referral_id}/assign", json={"worker": "Rhian"})
    agent_result = client.post("/run-social-care-agent", json={"patient_id": "PT-001"}).json()
    report = client.post("/generate-report", json={
        "agent_result": agent_result, "patient_name": "Gwendoline"}).json()
    case = client.post("/cases", json={
        "patient_id": "PT-001", "patient_name": "Gwendoline",
        "agent_result": agent_result, "report": report}).json()
    client.post(f"/referrals/{referral_id}/complete", json={"case_id": case["case_id"]})
    return referral_id


def test_reassess_no_updates_does_not_rerun(client):
    referral_id = _assessed_referral(client)
    result = client.post(f"/referrals/{referral_id}/reassess").json()
    assert result["changed"] is False


def test_reassess_significant_then_minor(client):
    referral_id = _assessed_referral(client)

    # A significant update should recommend a re-run.
    client.post("/clinical-updates/PT-001", json={
        "field_changed": "medication", "new_value": "increased to twice daily",
        "source": "Consultant"})
    significant = client.post(f"/referrals/{referral_id}/reassess").json()
    assert significant["changed"] is True
    assert significant["impact"]["recommend_rerun"] is True

    # A later minor update should be flagged as changed but not warrant a re-run.
    client.post("/clinical-updates/PT-001", json={
        "field_changed": "ward observation", "new_value": "settled and cheerful",
        "source": "Ward Nurse"})
    minor = client.post(f"/referrals/{referral_id}/reassess").json()
    assert minor["changed"] is True
    assert minor["impact"]["recommend_rerun"] is False


def test_reassess_folds_a_family_note(client):
    """A family note logged after the last review drives a reassessment."""
    referral_id = _assessed_referral(client)
    client.post(
        "/patients/PT-001/interactions",
        json={
            "actor_role": "Family/Carer",
            "note": "Concern: had a fall, can no longer manage stairs",
        },
    )
    result = client.post(f"/referrals/{referral_id}/reassess").json()
    assert result["changed"] is True
    assert result["impact"]["recommend_rerun"] is True
    assert "New information" in result["impact"]["summary"]
