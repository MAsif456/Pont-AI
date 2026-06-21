"""Tests for the needs-extraction tool, including discrepancy detection."""

from agents.intake import resolve_input
from models.api import RunAgentRequest
from models.patient import SourceNoteInput
from tools.extract_needs import extract_needs


def _extract_for_patient(mock_llm, patient_id):
    resolved = resolve_input(RunAgentRequest(patient_id=patient_id))
    return extract_needs(
        mock_llm, resolved.patient_data, resolved.raw_text, resolved.source_notes
    )


def test_discrepancies_only_for_conflicting_patients(mock_llm, patients, conflict_patient_ids):
    """Every conflict patient flags a discrepancy; every consistent one does not."""
    for record in patients:
        result = _extract_for_patient(mock_llm, record["patient_id"])
        has_discrepancy = len(result.discrepancies) > 0
        assert has_discrepancy == (record["patient_id"] in conflict_patient_ids), (
            record["patient_id"]
        )


def test_profile_fields_populated_for_all_patients(mock_llm, patients):
    for record in patients:
        profile = _extract_for_patient(mock_llm, record["patient_id"]).profile
        assert profile.dementia_stage
        assert profile.living_situation
        assert profile.summary


def test_personal_care_conflict_named(mock_llm):
    notes = [
        SourceNoteInput(source="Family/Carer", text="She needs hands-on help with personal care."),
        SourceNoteInput(source="Ward Nursing Record", text="Independent with personal care."),
    ]
    result = extract_needs(mock_llm, source_notes=notes)
    assert len(result.discrepancies) == 1
    discrepancy = result.discrepancies[0]
    assert "Family/Carer" in discrepancy.sources
    assert "Ward Nursing Record" in discrepancy.sources


def test_single_source_yields_no_discrepancy(mock_llm):
    notes = [SourceNoteInput(source="Family", text="needs help washing and dressing")]
    assert extract_needs(mock_llm, source_notes=notes).discrepancies == []
