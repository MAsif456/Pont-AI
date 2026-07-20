"""Tests for the GET /family-context endpoint."""

import warnings

from fastapi.testclient import TestClient

from main import app

warnings.filterwarnings("ignore")

client = TestClient(app)


def test_family_context_returns_record():
    response = client.get("/family-context/PT-001")
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == "PT-001"
    assert "consent_on_file" in body


def test_family_context_unknown_patient_404():
    assert client.get("/family-context/PT-999").status_code == 404
