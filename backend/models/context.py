"""Lightweight Clinical- and Family-domain context records.

These represent what the Clinical Agent and Family Agent would expose in the full
multi-agent architecture. In this phase they are static synthetic records returned
by lookup tools, not outputs of autonomous reasoning agents.
"""

from pydantic import BaseModel, Field


class ClinicalContext(BaseModel):
    """A patient's clinical-domain summary (represents the Clinical Agent)."""

    patient_id: str
    diagnosis_summary: str = ""
    medication: list[str] = Field(default_factory=list)
    discharge_readiness_score: str = ""
    outstanding_clinical_tasks: list[str] = Field(default_factory=list)


class FamilyContext(BaseModel):
    """A patient's family-domain summary (represents the Family Agent)."""

    patient_id: str
    family_preferences: str = ""
    consent_on_file: bool = False
    transport_notes: str = ""
