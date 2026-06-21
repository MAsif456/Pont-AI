"""Resolves agent input from either a known patient id or raw intake data."""

from dataclasses import dataclass, field

from core.data_loader import load_patients
from models.api import RunAgentRequest
from models.patient import SourceNoteInput

# Structured fields the extractor understands, copied from a stored patient record.
_INTAKE_FIELDS = (
    "age", "postcode_area", "dementia_type", "diagnosis_stage", "living_situation",
    "mobility", "cognitive_notes", "carer_present", "carer_notes", "current_support",
)


class PatientNotFoundError(ValueError):
    """Raised when a requested patient id is not in the synthetic dataset."""


@dataclass
class ResolvedInput:
    """Normalised agent input, however it was supplied."""

    patient_data: dict
    source_notes: list[SourceNoteInput]
    raw_text: str = ""
    patient_id: str | None = None
    patient_name: str | None = None
    postcode_area: str | None = None
    # Context lookups are only possible for a known patient id.
    has_patient_record: bool = field(default=False)


def resolve_input(request: RunAgentRequest) -> ResolvedInput:
    """Build a :class:`ResolvedInput` from the request."""
    if request.patient_id:
        return _from_patient_id(request.patient_id)
    return _from_raw_request(request)


def _from_patient_id(patient_id: str) -> ResolvedInput:
    """Load a stored synthetic patient and adapt it to agent input."""
    record = _find_patient(patient_id)
    return ResolvedInput(
        patient_data={key: record.get(key) for key in _INTAKE_FIELDS},
        source_notes=_source_notes_from_record(record),
        patient_id=patient_id,
        patient_name=record.get("name"),
        postcode_area=record.get("postcode_area"),
        has_patient_record=True,
    )


def _source_notes_from_record(record: dict) -> list[SourceNoteInput]:
    """Build the source notes, including the social worker's own assessment.

    The assessor's notes are a genuine account of the patient and carry much of
    the risk signal, so they are treated as an additional source to reconcile.
    """
    notes = [
        SourceNoteInput(source=note.get("source", ""), text=note.get("note", ""))
        for note in record.get("source_notes", [])
    ]
    if record.get("assessor_notes"):
        notes.append(
            SourceNoteInput(source="Social Worker Assessment", text=record["assessor_notes"])
        )
    return notes


def _find_patient(patient_id: str) -> dict:
    for record in load_patients():
        if record.get("patient_id") == patient_id:
            return record
    raise PatientNotFoundError(f"Unknown patient id: {patient_id}")


def _from_raw_request(request: RunAgentRequest) -> ResolvedInput:
    """Adapt directly-supplied intake data (no stored record, no context lookup)."""
    patient_data = request.patient_data.model_dump() if request.patient_data else {}
    return ResolvedInput(
        patient_data=patient_data,
        source_notes=list(request.source_notes),
        raw_text=request.raw_text or "",
        patient_name=request.patient_name,
        postcode_area=patient_data.get("postcode_area"),
        has_patient_record=False,
    )
