"""Lightweight Clinical- and Family-domain context records.

These represent what the Clinical Agent and Family Agent would expose in the full
multi-agent architecture. In this phase they are static synthetic records returned
by lookup tools, not outputs of autonomous reasoning agents.
"""

from pydantic import BaseModel, Field


class ClinicalUpdate(BaseModel):
    """An externally-sourced change to a patient's clinical record.

    These originate from the hospital side (a nurse, consultant or OT), not from
    the social worker using this tool. They are appended (never overwriting the
    baseline snapshot), mirroring the append-only ``source_notes`` pattern.
    """

    update_id: str
    timestamp: str
    field_changed: str
    previous_value: str = ""
    new_value: str = ""
    # Always a clinical/hospital actor, making the external origin explicit.
    source: str


class ClinicalContext(BaseModel):
    """A patient's clinical-domain summary (represents the Clinical Agent)."""

    patient_id: str
    diagnosis_summary: str = ""
    medication: list[str] = Field(default_factory=list)
    discharge_readiness_score: str = ""
    outstanding_clinical_tasks: list[str] = Field(default_factory=list)
    # History of incoming clinical updates (empty for the baseline snapshot).
    clinical_updates: list[ClinicalUpdate] = Field(default_factory=list)


class AddClinicalUpdateRequest(BaseModel):
    """Simulate an incoming clinical update arriving from the hospital system."""

    field_changed: str
    new_value: str
    previous_value: str = ""
    source: str
    timestamp: str | None = None


class FamilyContext(BaseModel):
    """A patient's family-domain summary (represents the Family Agent)."""

    patient_id: str
    family_preferences: str = ""
    consent_on_file: bool = False
    transport_notes: str = ""
