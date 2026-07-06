"""Endpoints for staff-interaction logging and the per-actor analytics.

Any actor can log a role-attributed interaction (no login), and the summary
quantifies involvement across the whole workflow -- logged interactions plus the
intake source notes and clinical updates already on record.
"""

from fastapi import APIRouter, Depends

from core.clinical_update_store import ClinicalUpdateStore
from core.interaction_store import InteractionStore, build_summary
from models.interaction import (
    InteractionSummary,
    LogInteractionRequest,
    StaffInteraction,
)

from .dependencies import get_clinical_update_store, get_interaction_store

router = APIRouter(tags=["interactions"])


@router.get("/patients/{patient_id}/interactions", response_model=InteractionSummary)
def get_interactions(
    patient_id: str,
    store: InteractionStore = Depends(get_interaction_store),
    clinical: ClinicalUpdateStore = Depends(get_clinical_update_store),
) -> InteractionSummary:
    """Return per-actor interaction counts and the merged interaction timeline."""
    return build_summary(patient_id, store, clinical)


@router.post("/patients/{patient_id}/interactions", response_model=StaffInteraction)
def log_interaction(
    patient_id: str,
    request: LogInteractionRequest,
    store: InteractionStore = Depends(get_interaction_store),
) -> StaffInteraction:
    """Log a new role-attributed interaction against a patient."""
    return store.add(patient_id, request.actor_role, request.note)
