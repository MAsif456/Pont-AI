"""Models for referral recommendations and the agent's reasoning trail."""

from typing import Literal

from pydantic import BaseModel, Field

from .context import ClinicalContext, FamilyContext
from .needs import Discrepancy, NeedsProfile

Confidence = Literal["high", "medium", "low"]


class Recommendation(BaseModel):
    """A single ranked referral recommendation."""

    service_id: str
    name: str
    category: str
    rank: int
    justification: str
    confidence: Confidence
    # Low-confidence matches must be surfaced for a human rather than presented
    # as a confident pick, per the human-in-the-loop requirement.
    recommended_for_human_review: bool = False
    # Contact details, enriched from the service directory (not model-generated).
    phone: str = ""
    address: str = ""


class ReasoningStep(BaseModel):
    """One logged step of the agent loop, shown in the UI reasoning trail."""

    step: int
    tool: str
    tool_input: str
    summary: str = Field(description="What the tool returned, summarised.")
    reasoning: str = Field(description="Why the agent took this step / chose the next.")
    # Which domain/MCP server the tool belongs to, for the coordination view.
    # Defaults so previously-stored steps (data/cases.json) stay valid.
    domain: str = "social_care"


class AgentResult(BaseModel):
    """The complete output of the Social Care Agent loop."""

    patient_id: str | None = None
    needs_profile: NeedsProfile
    discrepancies: list[Discrepancy] = Field(default_factory=list)
    clinical_context: ClinicalContext | None = None
    family_context: FamilyContext | None = None
    recommendations: list[Recommendation] = Field(default_factory=list)
    reasoning_trail: list[ReasoningStep] = Field(default_factory=list)
    tool_calls_used: int = 0
