"""Endpoints for persisted referral cases (the dashboard and history views)."""

from fastapi import APIRouter, Depends, HTTPException

from core.case_store import CaseStore
from models.api import CreateCaseRequest, CreateCaseResponse, UpdateCaseStatusRequest
from models.case import CaseStats, CaseSummary, PatientCase

from .dependencies import get_case_store

router = APIRouter(tags=["cases"])


@router.post("/cases", response_model=CreateCaseResponse)
def create_case(
    request: CreateCaseRequest, store: CaseStore = Depends(get_case_store)
) -> CreateCaseResponse:
    """Persist a completed pipeline run as an assessment on a patient's case."""
    case_id, assessment_id = store.add_assessment(
        request.patient_id, request.patient_name, request.agent_result, request.report
    )
    return CreateCaseResponse(case_id=case_id, assessment_id=assessment_id)


@router.get("/cases", response_model=list[CaseSummary])
def list_cases(store: CaseStore = Depends(get_case_store)) -> list[CaseSummary]:
    """List all cases as dashboard summaries, most recently updated first."""
    return store.list_summaries()


# Declared before the /cases/{case_id} route so "stats" is not treated as an id.
@router.get("/cases/stats", response_model=CaseStats)
def case_stats(store: CaseStore = Depends(get_case_store)) -> CaseStats:
    """Return team-level aggregate figures for the dashboard summary."""
    return store.stats()


@router.get("/cases/{case_id}", response_model=PatientCase)
def get_case(case_id: str, store: CaseStore = Depends(get_case_store)) -> PatientCase:
    """Return a single case with its full assessment history."""
    case = store.get(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Unknown case id: {case_id}")
    return case


@router.patch("/cases/{case_id}/status", response_model=PatientCase)
def update_case_status(
    case_id: str,
    request: UpdateCaseStatusRequest,
    store: CaseStore = Depends(get_case_store),
) -> PatientCase:
    """Set the review status of a case's latest assessment."""
    case = store.update_latest_status(case_id, request.status, request.note)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Unknown case id: {case_id}")
    return case
