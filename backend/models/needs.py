"""Models describing an extracted needs profile and source discrepancies."""

from pydantic import BaseModel, Field


class Discrepancy(BaseModel):
    """A flagged disagreement between two or more source notes."""

    sources: list[str] = Field(
        description="The sources that disagree, e.g. ['Family/Carer', 'Ward Nursing Record']."
    )
    description: str = Field(
        description="Plain-language explanation of what the sources disagree about."
    )


class NeedsProfile(BaseModel):
    """The structured needs profile extracted from patient input."""

    dementia_stage: str = ""
    mobility_needs: str = ""
    living_situation: str = ""
    carer_status: str = ""
    key_risks: list[str] = Field(default_factory=list)
    summary: str = ""


class NeedsResult(BaseModel):
    """Output of the needs-extraction tool: profile plus any discrepancies."""

    profile: NeedsProfile
    discrepancies: list[Discrepancy] = Field(default_factory=list)
