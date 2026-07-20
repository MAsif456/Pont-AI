"""Tests for the dashboard caseload status derivation."""

import json
import warnings
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from core.case_store import CaseStore
from core.caseload import _flagged, _status, build_caseload
from core.clinical_update_store import ClinicalUpdateStore
from core.interaction_store import InteractionStore
from core.referral_store import ReferralStore, build_referral
from main import app
from models.referral_intake import CreateReferralRequest
from routers.dependencies import get_case_store, get_referral_store

warnings.filterwarnings("ignore")


def _case(status, discrepancies=0):
    return SimpleNamespace(status=status, discrepancy_count=discrepancies)


def _ref(status, flag=None):
    return SimpleNamespace(status=status, verification_flag=flag)


@pytest.mark.parametrize(
    "referral,case,expected",
    [
        (None, None, "draft"),
        (_ref("new"), None, "in_progress"),
        (_ref("assigned"), None, "in_progress"),
        (_ref("report_ready"), None, "pending_review"),
        (_ref("approved"), None, "referred"),
        (_ref("closed_information_only"), None, "referred"),
        (None, _case("pending_review"), "pending_review"),
        (None, _case("changes_requested"), "in_progress"),
        (None, _case("approved"), "referred"),
        (_ref("report_ready"), _case("approved"), "referred"),  # most advanced wins
    ],
)
def test_status_mapping(referral, case, expected):
    assert _status(referral, case) == expected


def test_flagged_from_discrepancy_or_verification():
    assert _flagged(None, _case("pending_review", discrepancies=1)) is True
    assert _flagged(_ref("screened", flag="conflict"), None) is True
    assert _flagged(None, _case("approved", discrepancies=0)) is False


@pytest.fixture
def client(tmp_path):
    app.dependency_overrides[get_referral_store] = lambda: ReferralStore(
        path=tmp_path / "referrals.json"
    )
    app.dependency_overrides[get_case_store] = lambda: CaseStore(path=tmp_path / "cases.json")
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_caseload_all_draft_when_empty(client):
    rows = client.get("/caseload").json()
    assert len(rows) == 12
    assert all(row["status"] == "draft" for row in rows)


def test_caseload_reflects_referral(client, tmp_path):
    store = ReferralStore(path=tmp_path / "referrals.json")
    referral = store.create(
        build_referral(
            CreateReferralRequest(
                patient_name="Gwendoline", patient_id="PT-001",
                source="ward_nursing", reason_for_referral="Needs support.",
            )
        )
    )
    store.assign(referral.referral_id, "Rhian")
    row = next(r for r in client.get("/caseload").json() if r["patient_id"] == "PT-001")
    assert row["status"] == "in_progress"
    assert row["referral_id"] == referral.referral_id


def test_caseload_flags_reassessment_when_new_information(tmp_path):
    """A linked referral with a newer clinical update marks the row reassessment_due."""
    referral_store = ReferralStore(path=tmp_path / "referrals.json")
    referral = referral_store.create(
        build_referral(
            CreateReferralRequest(
                patient_name="Gwendoline", patient_id="PT-001",
                source="ward_nursing", reason_for_referral="Needs support.",
            )
        )
    )
    referral_store.link_case(referral.referral_id, "case-x")  # sets clinical_reviewed_at = now

    clinical_path = tmp_path / "clinical_context.json"
    clinical_path.write_text(
        json.dumps([{"patient_id": "PT-001", "diagnosis_summary": "Dementia"}]), encoding="utf-8"
    )
    clinical = ClinicalUpdateStore(path=clinical_path)
    clinical.add_update(
        "PT-001", "mobility", "walking frame", "independent", "OT",
        timestamp="2099-01-01T00:00:00+00:00",  # comfortably after clinical_reviewed_at
    )

    rows = build_caseload(
        referral_store, CaseStore(path=tmp_path / "cases.json"), clinical,
        InteractionStore(path=tmp_path / "interactions.json"),
    )
    row = next(r for r in rows if r.patient_id == "PT-001")
    assert row.reassessment_due is True
    assert "clinical update" in (row.flag_reason or "")
