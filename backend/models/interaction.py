"""Models for staff-interaction logging and the per-actor analytics.

Every touchpoint on a patient is attributed to an actor role (no login needed).
Counts across the whole workflow -- logged interactions plus the source notes and
clinical updates already captured -- quantify how much each actor is involved.
"""

from pydantic import BaseModel, Field

# Canonical actor roles the analytics groups by. Raw source labels are normalised
# onto these (see interaction_store.normalise_role).
ACTOR_ROLES = [
    "Ward Nurse", "OT", "Consultant", "GP", "Social Worker",
    "Discharge Liaison", "Family/Carer",
]


class StaffInteraction(BaseModel):
    """One recorded interaction with a patient, attributed to an actor role."""

    interaction_id: str
    patient_id: str
    actor_role: str
    note: str = ""
    timestamp: str
    # Where the interaction came from: a directly logged note, an intake source
    # note, or a clinical update. Lets the UI show the origin honestly.
    channel: str = "logged"


class LogInteractionRequest(BaseModel):
    """Log a new interaction against a patient."""

    actor_role: str = Field(min_length=1)
    note: str = ""


class ActorCount(BaseModel):
    """How many times one actor role has interacted with the patient."""

    role: str
    count: int


class InteractionSummary(BaseModel):
    """Per-actor counts plus the merged interaction timeline for a patient."""

    patient_id: str
    total: int = 0
    by_actor: list[ActorCount] = Field(default_factory=list)
    interactions: list[StaffInteraction] = Field(default_factory=list)
