"""End-to-end endpoint tests via FastAPI's TestClient.

Dependencies are overridden so the API runs against the mock model and the
isolated test vector store rather than the process-wide singletons.
"""

import warnings

import pytest
from fastapi.testclient import TestClient

from agents.social_care_agent import SocialCareAgent
from config import BACKEND_ROOT
from core.case_store import CaseStore
from main import app
from routers.dependencies import get_agent, get_case_store, get_llm, get_vector_store

warnings.filterwarnings("ignore")
_SAMPLE_PDF = BACKEND_ROOT / "data" / "sample_pdfs" / "gp_referral_pritchard.pdf"


@pytest.fixture
def client(mock_llm, ingested_store, tmp_path):
    app.dependency_overrides[get_llm] = lambda: mock_llm
    app.dependency_overrides[get_vector_store] = lambda: ingested_store
    app.dependency_overrides[get_agent] = lambda: SocialCareAgent(mock_llm, ingested_store)
    # Isolate the case store to a temp file so tests never touch real data.
    app.dependency_overrides[get_case_store] = lambda: CaseStore(path=tmp_path / "cases.json")
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_list_patients_endpoint(client):
    response = client.get("/patients")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 12
    assert {"patient_id", "name", "diagnosis_stage"} <= set(body[0])


def test_run_agent_endpoint(client):
    response = client.post("/run-social-care-agent", json={"patient_id": "PT-001"})
    assert response.status_code == 200
    body = response.json()
    assert body["recommendations"]
    assert body["reasoning_trail"]
    assert body["discrepancies"]
    assert body["tool_calls_used"] <= 5


def test_run_agent_unknown_patient_returns_404(client):
    assert client.post("/run-social-care-agent", json={"patient_id": "PT-999"}).status_code == 404


def test_extract_needs_endpoint_flags_discrepancy(client):
    response = client.post(
        "/extract-needs",
        json={
            "source_notes": [
                {"source": "Family", "text": "needs hands-on help with personal care"},
                {"source": "Ward", "text": "independent with personal care"},
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["discrepancies"]


def test_generate_report_endpoint(client):
    agent_result = client.post("/run-social-care-agent", json={"patient_id": "PT-003"}).json()
    response = client.post(
        "/generate-report", json={"agent_result": agent_result, "patient_name": "Beryl Watkins"}
    )
    assert response.status_code == 200
    assert "REFERRAL REPORT" in response.json()["text_version"]


def test_upload_document_endpoint(client):
    with _SAMPLE_PDF.open("rb") as handle:
        response = client.post(
            "/upload-document", files={"file": ("gp.pdf", handle, "application/pdf")}
        )
    assert response.status_code == 200
    assert response.json()["characters_extracted"] > 100


def test_upload_rejects_non_pdf(client):
    response = client.post(
        "/upload-document", files={"file": ("note.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 400


def test_upload_handles_corrupt_pdf(client):
    response = client.post(
        "/upload-document", files={"file": ("bad.pdf", b"%PDF-broken", "application/pdf")}
    )
    assert response.status_code == 422


def _run_and_store(client, patient_id: str) -> dict:
    """Run the agent + report and persist the result as a case."""
    agent_result = client.post("/run-social-care-agent", json={"patient_id": patient_id}).json()
    report = client.post(
        "/generate-report", json={"agent_result": agent_result, "patient_name": patient_id}
    ).json()
    response = client.post(
        "/cases",
        json={
            "patient_id": patient_id,
            "patient_name": agent_result["patient_id"],
            "agent_result": agent_result,
            "report": report,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_case_lifecycle_endpoints(client):
    created = _run_and_store(client, "PT-001")
    case_id = created["case_id"]

    listed = client.get("/cases").json()
    assert any(case["case_id"] == case_id for case in listed)

    detail = client.get(f"/cases/{case_id}").json()
    assert detail["case_id"] == case_id
    assert len(detail["assessments"]) == 1

    approved = client.patch(f"/cases/{case_id}/status", json={"status": "approved"}).json()
    assert approved["assessments"][-1]["status"] == "approved"


def test_case_stats_endpoint(client):
    _run_and_store(client, "PT-001")
    stats = client.get("/cases/stats").json()
    assert stats["total_cases"] == 1
    assert stats["pending_review"] == 1
    assert stats["discrepancies_flagged"] == 1


def test_unknown_case_returns_404(client):
    assert client.get("/cases/does-not-exist").status_code == 404
