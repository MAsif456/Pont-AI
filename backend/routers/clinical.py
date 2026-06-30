"""Endpoints for incoming (simulated) clinical updates.

These represent data arriving from the hospital system. There is no real
webhook or polling -- updates are added manually for the demo, standing in for
what a production integration would push automatically.
"""

from fastapi import APIRouter, Depends, HTTPException

from core.clinical_update_store import ClinicalUpdateStore
from models.context import AddClinicalUpdateRequest, ClinicalContext

from .dependencies import get_clinical_update_store

router = APIRouter(tags=["clinical"])


def _invalidate_agent_clinical_cache() -> None:
    """Drop the agent tool's cached clinical records so a re-run sees the update.

    This only clears a cache; the unchanged ``get_clinical_context`` tool reloads
    ``clinical_context.json`` on its next call.
    """
    from tools.context_lookup import _clinical_records

    _clinical_records.cache_clear()


@router.get("/clinical-updates/{patient_id}", response_model=ClinicalContext)
def get_clinical_updates(
    patient_id: str, store: ClinicalUpdateStore = Depends(get_clinical_update_store)
) -> ClinicalContext:
    """Return a patient's clinical context, including its update history."""
    context = store.get_context(patient_id)
    if context is None:
        raise HTTPException(status_code=404, detail=f"Unknown patient id: {patient_id}")
    return context


@router.post("/clinical-updates/{patient_id}", response_model=ClinicalContext)
def add_clinical_update(
    patient_id: str,
    request: AddClinicalUpdateRequest,
    store: ClinicalUpdateStore = Depends(get_clinical_update_store),
) -> ClinicalContext:
    """Append an incoming clinical update to a patient's record."""
    context = store.add_update(
        patient_id,
        field_changed=request.field_changed,
        new_value=request.new_value,
        previous_value=request.previous_value,
        source=request.source,
        timestamp=request.timestamp,
    )
    if context is None:
        raise HTTPException(status_code=404, detail=f"Unknown patient id: {patient_id}")
    _invalidate_agent_clinical_cache()
    return context
