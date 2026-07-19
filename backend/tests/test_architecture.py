"""Tests for the GET /architecture coordination endpoint."""

import warnings

from fastapi.testclient import TestClient

from main import app

warnings.filterwarnings("ignore")

client = TestClient(app)


def test_architecture_groups_three_domains():
    response = client.get("/architecture")
    assert response.status_code == 200
    body = response.json()
    domains = {server["domain"] for server in body["servers"]}
    assert domains == {"clinical", "social_care", "family"}


def test_only_social_care_is_a_reasoning_agent():
    servers = {s["domain"]: s for s in client.get("/architecture").json()["servers"]}
    assert servers["social_care"]["is_reasoning_agent"] is True
    assert servers["clinical"]["is_reasoning_agent"] is False
    assert servers["family"]["is_reasoning_agent"] is False


def test_each_server_exposes_its_tools():
    servers = {s["domain"]: s for s in client.get("/architecture").json()["servers"]}
    # Every declared tool is grouped under its domain with a description.
    assert {t["name"] for t in servers["social_care"]["tools"]} == {
        "extract_needs",
        "search_services",
    }
    assert {t["name"] for t in servers["clinical"]["tools"]} == {"get_clinical_context"}
    assert {t["name"] for t in servers["family"]["tools"]} == {"get_family_context"}
    assert servers["clinical"]["tools"][0]["description"]
