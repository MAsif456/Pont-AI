"""Tests for the referral store and its lifecycle transitions."""

import pytest

from core.referral_store import ReferralStore, build_referral, now_iso
from models.referral_intake import (
    CreateReferralRequest,
    Referral,
    ScreeningResult,
)


@pytest.fixture
def store(tmp_path) -> ReferralStore:
    return ReferralStore(path=tmp_path / "referrals.json")


def _referral(referral_id: str = "RF-1", **overrides) -> Referral:
    base = {
        "referral_id": referral_id,
        "patient_name": "Test Patient",
        "source": "ward_nursing",
        "reason_for_referral": "Needs a care package.",
        "referred_at": now_iso(),
    }
    base.update(overrides)
    return Referral(**base)


def test_create_and_get(store):
    store.create(_referral("RF-1"))
    assert store.get("RF-1").status == "new"
    assert len(store.list_all()) == 1
    assert store.get("missing") is None


def test_build_referral_defaults_to_new(store):
    request = CreateReferralRequest(
        patient_name="Walk In", source="self_family", reason_for_referral="advice"
    )
    referral = build_referral(request)
    assert referral.status == "new"
    assert referral.referral_id
    assert referral.referred_at


@pytest.mark.parametrize(
    "outcome,expected_status",
    [
        ("information_only", "closed_information_only"),
        ("redirect", "closed_redirected"),
        ("proportionate_assessment", "screened"),
    ],
)
def test_screening_moves_to_correct_status(store, outcome, expected_status):
    store.create(_referral("RF-1"))
    result = ScreeningResult(outcome=outcome, rationale="because", verification_flag=None)
    updated = store.apply_screening("RF-1", result)
    assert updated.status == expected_status
    assert updated.screening_outcome == outcome
    assert updated.screening_notes == "because"


def test_full_proportionate_lifecycle_persists(store):
    store.create(_referral("RF-1"))
    store.apply_screening(
        "RF-1", ScreeningResult(outcome="proportionate_assessment", rationale="care")
    )
    store.assign("RF-1", "Rhian Davies")
    store.mark_in_progress("RF-1")
    store.link_case("RF-1", "case-123")
    store.approve("RF-1")

    # A fresh store reading the same file must see every persisted transition.
    reloaded = ReferralStore(path=store._path).get("RF-1")
    assert reloaded.status == "approved"
    assert reloaded.assigned_worker == "Rhian Davies"
    assert reloaded.case_id == "case-123"


def test_mutations_on_unknown_referral_return_none(store):
    assert store.assign("nope", "X") is None
    assert store.approve("nope") is None


def test_open_caseload_counts_only_live_work(store):
    store.create(_referral("RF-1"))
    store.create(_referral("RF-2"))
    store.assign("RF-1", "Mark Foley")
    store.assign("RF-2", "Mark Foley")
    store.approve("RF-2")  # approved no longer counts as open
    assert store.open_caseload() == {"Mark Foley": 1}


def test_atomic_write_leaves_no_temp_files(store, tmp_path):
    store.create(_referral("RF-1"))
    assert list(tmp_path.glob("*.tmp")) == []
