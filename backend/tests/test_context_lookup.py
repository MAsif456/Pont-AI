"""Tests for the Clinical/Family context lookup tools."""

from tools.context_lookup import get_clinical_context, get_family_context


def test_clinical_context_for_known_patient():
    clinical = get_clinical_context("PT-003")
    assert clinical is not None
    assert clinical.patient_id == "PT-003"
    assert clinical.discharge_readiness_score


def test_family_context_for_known_patient():
    family = get_family_context("PT-007")
    assert family is not None
    # PT-007 has no known family contact, so consent is not on file.
    assert family.consent_on_file is False


def test_unknown_patient_returns_none():
    assert get_clinical_context("PT-999") is None
    assert get_family_context("PT-999") is None
