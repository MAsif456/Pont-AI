"""Models for persisted referral cases and their assessment history.

A *case* tracks one patient's referral journey over time. Each *assessment* is a
single run through the pipeline (its needs profile, recommendations and report),
so a patient who is re-assessed later gains a second assessment on the same case
-- this is what powers the patient history and "dynamic care plan" views.
"""

from typing import Literal

from pydantic import BaseModel, Field

from .referral import AgentResult
from .report import ReferralReport

CaseStatus = Literal["pending_review", "approved", "changes_requested"]


class StoredAssessment(BaseModel):
    """One pipeline run captured for the case history."""

    assessment_id: str
    created_at: str
    status: CaseStatus = "pending_review"
    note: str = ""
    agent_result: AgentResult
    report: ReferralReport


class PatientCase(BaseModel):
    """A patient's full referral history (one or more assessments)."""

    case_id: str
    patient_id: str | None = None
    patient_name: str
    created_at: str
    updated_at: str
    assessments: list[StoredAssessment] = Field(default_factory=list)

    @property
    def latest(self) -> StoredAssessment:
        """The most recent assessment, which drives the dashboard row."""
        return self.assessments[-1]


class CaseSummary(BaseModel):
    """A condensed case for the dashboard list."""

    case_id: str
    patient_id: str | None
    patient_name: str
    assessed_date: str
    status: CaseStatus
    top_service: str | None = None
    top_category: str | None = None
    top_confidence: str | None = None
    discrepancy_count: int = 0
    assessment_count: int = 1


class CaseStats(BaseModel):
    """Team-level aggregate figures for the dashboard summary."""

    total_cases: int = 0
    pending_review: int = 0
    approved: int = 0
    changes_requested: int = 0
    discrepancies_flagged: int = 0
    assessed_this_month: int = 0
    discrepancies_this_week: int = 0
