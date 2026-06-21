"""Endpoint: GET /patients -- lists synthetic patients for the demo picker."""

from fastapi import APIRouter

from core.data_loader import load_patients
from models.api import PatientSummary

router = APIRouter(tags=["patients"])


@router.get("/patients", response_model=list[PatientSummary])
def list_patients() -> list[PatientSummary]:
    """Return a short summary of each synthetic patient for intake selection."""
    return [PatientSummary.model_validate(record) for record in load_patients()]
