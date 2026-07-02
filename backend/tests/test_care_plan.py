"""Tests for the Dynamic Care Plan synthesis and endpoint."""

import warnings

import pytest
from fastapi.testclient import TestClient

from agents.social_care_agent import SocialCareAgent
from core.care_plan import synthesise_care_plan
from core.case_store import CaseStore
from core.referral_store import ReferralStore
from main import app
from models.context import ClinicalContext, ClinicalUpdate, FamilyContext
from models.needs import NeedsProfile
from models.referral import AgentResult, Recommendation
from routers.dependencies import (
    get_agent,
    get_case_store,
    get_llm,
    get_referral_store,
    get_vector_store,
)

warnings.filterwarnings("ignore")


def _agent_result(recommendations=None, risks=None) -> AgentResult:
    return AgentResult(
        needs_profile=NeedsProfile(
            dementia_stage="moderate", living_situation="lives alone",
            key_risks=risks or [], summary="Moderate dementia, lives alone.",
        ),
        recommendations=recommendations or [],
    )


def _recommendation() -> Recommendation:
    return Recommendation(
        service_id="SVC-1", name="Home Care", category="home care", rank=1,
        justification="Fits.", confidence="high",
    )


def test_ready_plan_passes_through_recommendations(mock_llm):
    plan = synthesise_care_plan(
        mock_llm, _agent_result([_recommendation()]),
        ClinicalContext(patient_id="P", discharge_readiness_score="Ready"),
        FamilyContext(patient_id="P", consent_on_file=True), "Pat", version=1,
    )
    assert "ready for discharge" in plan.discharge_recommendation.lower()
    assert plan.version == 1
    assert plan.recommended_services  # not re-invented, passed through
    assert "DYNAMIC CARE PLAN" in plan.text_version


def test_outstanding_tasks_delay_discharge(mock_llm):
    plan = synthesise_care_plan(
        mock_llm, _agent_result([_recommendation()]),
        ClinicalContext(
            patient_id="P", discharge_readiness_score="Pending OT assessment",
            outstanding_clinical_tasks=["Awaiting OT home visit"],
        ),
        FamilyContext(patient_id="P", consent_on_file=True), "Pat", version=1,
    )
    assert "delayed" in plan.discharge_recommendation.lower()


def test_flag_clinical_ready_but_no_package(mock_llm):
    plan = synthesise_care_plan(
        mock_llm, _agent_result(recommendations=[]),
        ClinicalContext(patient_id="P", discharge_readiness_score="Ready"),
        FamilyContext(patient_id="P", consent_on_file=True), "Pat", version=1,
    )
    flags = [flag.description.lower() for flag in plan.cross_domain_flags]
    assert any("no social care package" in flag for flag in flags)


def test_flag_consent_not_on_file(mock_llm):
    plan = synthesise_care_plan(
        mock_llm, _agent_result([_recommendation()]),
        ClinicalContext(patient_id="P", discharge_readiness_score="Ready"),
        FamilyContext(patient_id="P", consent_on_file=False), "Pat", version=1,
    )
    assert any("consent" in flag.description.lower() for flag in plan.cross_domain_flags)


def test_medication_update_delays_and_flags(mock_llm):
    clinical = ClinicalContext(patient_id="P", discharge_readiness_score="Ready")
    clinical.clinical_updates.append(
        ClinicalUpdate(
            update_id="u", timestamp="2026-06-30T00:00:00+00:00",
            field_changed="medication", new_value="twice daily", source="Consultant",
        )
    )
    plan = synthesise_care_plan(
        mock_llm, _agent_result([_recommendation()]), clinical,
        FamilyContext(patient_id="P", consent_on_file=True), "Pat", version=2,
    )
    assert "delayed" in plan.discharge_recommendation.lower()
    assert plan.version == 2


@pytest.fixture
def client(mock_llm, ingested_store, tmp_path):
    app.dependency_overrides[get_llm] = lambda: mock_llm
    app.dependency_overrides[get_vector_store] = lambda: ingested_store
    app.dependency_overrides[get_agent] = lambda: SocialCareAgent(mock_llm, ingested_store)
    app.dependency_overrides[get_case_store] = lambda: CaseStore(path=tmp_path / "cases.json")
    app.dependency_overrides[get_referral_store] = lambda: ReferralStore(
        path=tmp_path / "referrals.json"
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_care_plan_endpoint(client):
    agent_result = client.post("/run-social-care-agent", json={"patient_id": "PT-003"}).json()
    report = client.post(
        "/generate-report", json={"agent_result": agent_result, "patient_name": "Beryl"}
    ).json()
    case = client.post(
        "/cases",
        json={"patient_id": "PT-003", "patient_name": "Beryl",
              "agent_result": agent_result, "report": report},
    ).json()

    response = client.post("/care-plan", json={"case_id": case["case_id"]})
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 1
    assert body["discharge_recommendation"]
    assert "human_review_statement" in body


def test_care_plan_unknown_case_404(client):
    assert client.post("/care-plan", json={"case_id": "nope"}).status_code == 404
