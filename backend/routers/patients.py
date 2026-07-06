"""Endpoints for patient listings and the dashboard caseload."""

from fastapi import APIRouter, Depends

from core.case_store import CaseStore
from core.caseload import build_caseload
from core.data_loader import load_patients
from core.referral_store import ReferralStore
from models.api import CaseloadRow, PatientSummary

from .dependencies import get_case_store, get_referral_store

router = APIRouter(tags=["patients"])


@router.get("/patients", response_model=list[PatientSummary])
def list_patients() -> list[PatientSummary]:
    """Return a short summary of each synthetic patient for intake selection."""
    return [PatientSummary.model_validate(record) for record in load_patients()]


@router.get("/caseload", response_model=list[CaseloadRow])
def caseload(
    referral_store: ReferralStore = Depends(get_referral_store),
    case_store: CaseStore = Depends(get_case_store),
) -> list[CaseloadRow]:
    """Return the dashboard caseload: each patient with a derived workflow status."""
    return build_caseload(referral_store, case_store)
