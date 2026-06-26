"""Tests for the bounded referral screening call (mock mode)."""

import json

import pytest

from config import BACKEND_ROOT
from core.referral_store import now_iso
from core.screening import screen_referral
from models.referral_intake import Referral


def _referral(reason: str, electronic=None, handover=None) -> Referral:
    return Referral(
        referral_id="RF-X", patient_name="P", source="ward_nursing",
        reason_for_referral=reason, electronic_note=electronic,
        handover_note=handover, referred_at=now_iso(),
    )


@pytest.mark.parametrize(
    "reason,expected",
    [
        ("Help applying for Attendance Allowance and benefits.", "redirect"),
        ("Request for a housing transfer due to unsuitable stairs.", "redirect"),
        ("General enquiry about what support services are available.", "information_only"),
        ("Request for an information leaflet about day centres.", "information_only"),
        ("Dementia with recurrent falls, needs support at home.", "proportionate_assessment"),
        ("Severe dementia, needs a care package and respite.", "proportionate_assessment"),
    ],
)
def test_classification(mock_llm, reason, expected):
    assert screen_referral(mock_llm, _referral(reason)).outcome == expected


def test_note_conflict_is_flagged(mock_llm):
    referral = _referral(
        "Query mobility support needs.",
        electronic="Mobilising independently, no concerns.",
        handover="Now using a walking frame following a fall last week.",
    )
    result = screen_referral(mock_llm, referral)
    assert result.verification_flag is not None
    assert "mobility" in result.verification_flag.lower()


def test_consistent_notes_are_not_flagged(mock_llm):
    referral = _referral(
        "Query support needs.",
        electronic="Uses a walking frame and needs help at home.",
        handover="Uses a walking frame; requires support with daily tasks.",
    )
    assert screen_referral(mock_llm, referral).verification_flag is None


def test_missing_note_yields_no_flag(mock_llm):
    referral = _referral("Care needs.", electronic="Independent mobility.", handover=None)
    assert screen_referral(mock_llm, referral).verification_flag is None


def test_seed_dataset_flags_exactly_the_conflict_referrals(mock_llm):
    """The four deliberately-conflicting seed referrals must all be flagged."""
    records = json.loads(
        (BACKEND_ROOT / "data" / "referrals_seed.json").read_text(encoding="utf-8")
    )
    flagged = set()
    for record in records:
        referral = _referral(
            record["reason_for_referral"],
            electronic=record.get("electronic_note"),
            handover=record.get("handover_note"),
        )
        if screen_referral(mock_llm, referral).verification_flag:
            flagged.add(record["referral_id"])
    assert flagged == {"RF-002", "RF-003", "RF-004", "RF-005"}
