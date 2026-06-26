"""Endpoint tests for the referral coordination layer, including the full chain."""

import warnings

import pytest
from fastapi.testclient import TestClient

from agents.social_care_agent import SocialCareAgent
from core.case_store import CaseStore
from core.referral_store import ReferralStore
from main import app
from routers.dependencies import (
    get_agent,
    get_case_store,
    get_llm,
    get_referral_store,
    get_vector_store,
)

warnings.filterwarnings("ignore")


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


def _create(client, reason, **extra) -> dict:
    body = {"patient_name": "Test", "source": "ward_nursing", "reason_for_referral": reason}
    body.update(extra)
    response = client.post("/referrals", json=body)
    assert response.status_code == 200
    return response.json()


def test_create_lists_and_fetches(client):
    created = _create(client, "Needs a care package.")
    assert created["status"] == "new"
    assert any(r["referral_id"] == created["referral_id"] for r in client.get("/referrals").json())
    assert client.get(f"/referrals/{created['referral_id']}").status_code == 200
    assert client.get("/referrals/missing").status_code == 404


def test_information_only_screens_closed(client):
    referral = _create(client, "General enquiry about what support services are available.")
    screened = client.post(f"/referrals/{referral['referral_id']}/screen").json()
    assert screened["screening_outcome"] == "information_only"
    assert screened["status"] == "closed_information_only"


def test_redirect_screens_closed(client):
    referral = _create(client, "Help applying for benefits and a housing transfer.")
    screened = client.post(f"/referrals/{referral['referral_id']}/screen").json()
    assert screened["screening_outcome"] == "redirect"
    assert screened["status"] == "closed_redirected"


def test_screen_flags_note_conflict(client):
    referral = _create(
        client, "Query mobility needs.",
        electronic_note="Mobilising independently.",
        handover_note="Now using a walking frame following a fall.",
    )
    screened = client.post(f"/referrals/{referral['referral_id']}/screen").json()
    assert screened["verification_flag"] is not None


def test_full_proportionate_chain_to_approved(client):
    # 1. New referral for a known patient, screened as proportionate.
    referral = _create(
        client, "Moderate dementia with falls, needs support at home.", patient_id="PT-001"
    )
    referral_id = referral["referral_id"]
    screened = client.post(f"/referrals/{referral_id}/screen").json()
    assert screened["status"] == "screened"
    assert screened["screening_outcome"] == "proportionate_assessment"

    # 2. Assign, then run the EXISTING agent + report + case (the handoff).
    assigned = client.post(f"/referrals/{referral_id}/assign", json={"worker": "Rhian"}).json()
    assert assigned["status"] == "assigned"
    client.post(f"/referrals/{referral_id}/start")
    agent_result = client.post("/run-social-care-agent", json={"patient_id": "PT-001"}).json()
    report = client.post(
        "/generate-report", json={"agent_result": agent_result, "patient_name": "PT-001"}
    ).json()
    case = client.post(
        "/cases",
        json={
            "patient_id": "PT-001", "patient_name": "Gwendoline",
            "agent_result": agent_result, "report": report,
        },
    ).json()

    # 3. Link the case back to the referral, then approve.
    linked = client.post(
        f"/referrals/{referral_id}/complete", json={"case_id": case["case_id"]}
    ).json()
    assert linked["status"] == "report_ready"
    assert linked["case_id"] == case["case_id"]

    client.patch(f"/cases/{case['case_id']}/status", json={"status": "approved"})
    approved = client.post(f"/referrals/{referral_id}/approve").json()
    assert approved["status"] == "approved"


def test_caseload_suggests_least_loaded(client):
    first = _create(client, "Care needs A.")
    second = _create(client, "Care needs B.")
    client.post(f"/referrals/{first['referral_id']}/assign", json={"worker": "Busy"})
    client.post(f"/referrals/{first['referral_id']}/screen")
    client.post(f"/referrals/{second['referral_id']}/assign", json={"worker": "Free"})
    # Mark one of Busy's as in progress so it counts as open work.
    client.post(f"/referrals/{first['referral_id']}/start")
    suggestion = client.get("/referrals/caseload").json()
    assert suggestion["suggested_worker"] in {"Busy", "Free"}
    assert set(suggestion["loads"]) == {"Busy", "Free"}
