"""Request and response DTOs for the public API endpoints."""

from typing import Literal

from pydantic import BaseModel, Field

from .case import CaseStatus
from .needs import NeedsResult
from .patient import PatientIntake, SourceNoteInput
from .referral import AgentResult
from .report import ReferralReport

# Patient-level workflow status shown on the dashboard caseload.
CaseloadStatus = Literal["draft", "in_progress", "pending_review", "referred"]


class ExtractNeedsRequest(BaseModel):
    """Input to the needs-extraction tool/endpoint.

    Accepts structured form data, free text (e.g. from a PDF), or both, plus any
    number of source notes for the same patient.
    """

    patient_data: PatientIntake | None = None
    raw_text: str | None = None
    source_notes: list[SourceNoteInput] = Field(default_factory=list)


class RunAgentRequest(BaseModel):
    """Input to the Social Care Agent.

    Either reference a known synthetic patient by ``patient_id`` (which also
    unlocks clinical/family context lookup), or supply raw intake directly.
    """

    patient_id: str | None = None
    patient_data: PatientIntake | None = None
    raw_text: str | None = None
    source_notes: list[SourceNoteInput] = Field(default_factory=list)
    patient_name: str | None = None


class GenerateReportRequest(BaseModel):
    """Input to report generation: the agent's output plus an optional name."""

    agent_result: AgentResult
    patient_name: str | None = None


class PatientSummary(BaseModel):
    """A short patient summary for the intake demo picker."""

    patient_id: str
    name: str
    age: int | None = None
    postcode_area: str = ""
    dementia_type: str = ""
    diagnosis_stage: str = ""


class CaseloadRow(BaseModel):
    """One patient on the dashboard caseload, with derived workflow status."""

    patient_id: str
    name: str
    age: int | None = None
    postcode_area: str = ""
    dementia_type: str = ""
    diagnosis_stage: str = ""
    status: CaseloadStatus = "draft"
    updated_at: str = ""
    # A discrepancy or note conflict is on record for this patient.
    flagged: bool = False
    case_id: str | None = None
    referral_id: str | None = None


class UploadDocumentResponse(BaseModel):
    """Result of extracting text from an uploaded PDF and running extraction."""

    raw_text: str
    characters_extracted: int
    needs: NeedsResult
    # Set when extraction yielded little or no usable text, so the UI can warn.
    warning: str | None = None


class CreateCaseRequest(BaseModel):
    """Persist a completed pipeline run as an assessment on a patient's case."""

    patient_id: str | None = None
    patient_name: str
    agent_result: AgentResult
    report: ReferralReport


class CreateCaseResponse(BaseModel):
    """Identifiers for the stored case and the assessment just added to it."""

    case_id: str
    assessment_id: str


class UpdateCaseStatusRequest(BaseModel):
    """Update the review status of a case's latest assessment."""

    status: CaseStatus
    note: str = ""
