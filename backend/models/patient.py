"""Models for patient intake input (form fields and source notes)."""

from pydantic import BaseModel, Field


class SourceNoteInput(BaseModel):
    """One account of a patient's needs from a single source.

    Multiple of these are supplied per patient because family, ward staff and
    social workers often describe the same person differently -- the conflicts
    are exactly what discrepancy detection surfaces.
    """

    source: str = Field(description="Who the note came from, e.g. 'Family/Carer'.")
    text: str = Field(description="The account in that source's own words.")


class PatientIntake(BaseModel):
    """Structured intake fields from the social-care form.

    Every field is optional so the pipeline degrades gracefully when a form is
    only partly completed or a PDF yields little structured data.
    """

    age: int | None = None
    postcode_area: str | None = None
    dementia_type: str | None = None
    diagnosis_stage: str | None = None
    living_situation: str | None = None
    mobility: str | None = None
    cognitive_notes: str | None = None
    carer_present: bool | None = None
    carer_notes: str | None = None
    current_support: str | None = None
