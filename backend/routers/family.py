"""Endpoint: GET /family-context/{patient_id} -- the Family domain record.

Read-only. The family portal uses this to show a relative their recorded care
preferences, consent and transport. Family *notes* are written through the
interaction store, not here.
"""

from fastapi import APIRouter, HTTPException

from models.context import FamilyContext
from tools.context_lookup import get_family_context

router = APIRouter(tags=["family"])


@router.get("/family-context/{patient_id}", response_model=FamilyContext)
def family_context(patient_id: str) -> FamilyContext:
    """Return the Family domain's record for a patient (404 if unknown)."""
    context = get_family_context(patient_id)
    if context is None:
        raise HTTPException(status_code=404, detail=f"No family record for patient: {patient_id}")
    return context
