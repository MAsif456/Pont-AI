"""Tests for staff-interaction logging and per-actor analytics."""

import warnings

import pytest
from fastapi.testclient import TestClient

from core.clinical_update_store import ClinicalUpdateStore
from core.interaction_store import InteractionStore, build_summary, normalise_role
from main import app
from routers.dependencies import get_interaction_store

warnings.filterwarnings("ignore")


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Ward Nursing Record", "Ward Nurse"),
        ("Ward Nurse", "Ward Nurse"),
        ("OT", "OT"),
        ("ot", "OT"),
        ("Consultant", "Consultant"),
        ("Social Worker Observation", "Social Worker"),
        ("community_social_worker", "Social Worker"),
        ("Family/Carer", "Family/Carer"),
        ("self_family", "Family/Carer"),
        ("discharge_liaison", "Discharge Liaison"),
        ("GP", "GP"),
    ],
)
def test_normalise_role(raw, expected):
    assert normalise_role(raw) == expected


@pytest.fixture
def store(tmp_path) -> InteractionStore:
    return InteractionStore(path=tmp_path / "interactions.json")


def test_add_and_list(store):
    store.add("PT-001", "OT", "Home visit")
    assert len(store.list_for("PT-001")) == 1
    assert store.list_for("PT-002") == []


def test_logged_role_is_normalised(store):
    interaction = store.add("PT-001", "Occupational Therapy", "note")
    assert interaction.actor_role == "OT"


def test_summary_folds_in_source_notes(store):
    summary = build_summary("PT-001", store, ClinicalUpdateStore())
    # PT-001 has three intake source notes (family, ward, social worker).
    assert summary.total >= 3
    roles = {actor.role for actor in summary.by_actor}
    assert {"Ward Nurse", "Family/Carer", "Social Worker"} <= roles


def test_logged_interactions_increment_counts(store):
    clinical = ClinicalUpdateStore()
    before = build_summary("PT-001", store, clinical).total
    store.add("PT-001", "OT", "note")
    store.add("PT-001", "OT", "note 2")
    after = build_summary("PT-001", store, clinical)
    assert after.total == before + 2
    ot = next(actor for actor in after.by_actor if actor.role == "OT")
    assert ot.count == 2
    # Most recent (a logged interaction) sorts to the top of the timeline.
    assert after.interactions[0].channel == "logged"


@pytest.fixture
def client(tmp_path):
    app.dependency_overrides[get_interaction_store] = lambda: InteractionStore(
        path=tmp_path / "interactions.json"
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_interactions_endpoints(client):
    baseline = client.get("/patients/PT-001/interactions").json()["total"]
    logged = client.post(
        "/patients/PT-001/interactions", json={"actor_role": "OT", "note": "Home visit"}
    )
    assert logged.status_code == 200
    assert logged.json()["actor_role"] == "OT"
    assert client.get("/patients/PT-001/interactions").json()["total"] == baseline + 1
