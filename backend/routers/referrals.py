"""Endpoints for the referral intake and coordination layer.

These sit in front of the existing Social Care Agent. The only handoff to the
agent happens client-side: the referral detail view calls the unchanged
``/run-social-care-agent`` and then posts the resulting case id back here.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.llm.base import LLMClient
from core.referral_store import ReferralStore, build_referral
from core.screening import screen_referral
from models.referral_intake import (
    AssignReferralRequest,
    CompleteReferralRequest,
    CreateReferralRequest,
    Referral,
)

from .dependencies import get_llm, get_referral_store

router = APIRouter(tags=["referrals"])


class CaseloadSuggestion(BaseModel):
    """Open-referral counts per worker and the least-loaded suggestion."""

    loads: dict[str, int]
    suggested_worker: str | None = None


def _require(referral: Referral | None, referral_id: str) -> Referral:
    if referral is None:
        raise HTTPException(status_code=404, detail=f"Unknown referral id: {referral_id}")
    return referral


@router.post("/referrals", response_model=Referral)
def create_referral(
    request: CreateReferralRequest, store: ReferralStore = Depends(get_referral_store)
) -> Referral:
    """Create a new referral with status 'new'."""
    return store.create(build_referral(request))


@router.get("/referrals", response_model=list[Referral])
def list_referrals(store: ReferralStore = Depends(get_referral_store)) -> list[Referral]:
    """List all referrals for the coordination board."""
    return store.list_all()


# Declared before /referrals/{referral_id} so "caseload" is not read as an id.
@router.get("/referrals/caseload", response_model=CaseloadSuggestion)
def caseload(store: ReferralStore = Depends(get_referral_store)) -> CaseloadSuggestion:
    """Suggest the least-loaded worker by open-referral count."""
    loads = store.open_caseload()
    suggested = min(loads, key=loads.get) if loads else None
    return CaseloadSuggestion(loads=loads, suggested_worker=suggested)


@router.get("/referrals/{referral_id}", response_model=Referral)
def get_referral(referral_id: str, store: ReferralStore = Depends(get_referral_store)) -> Referral:
    """Return a single referral."""
    return _require(store.get(referral_id), referral_id)


@router.post("/referrals/{referral_id}/screen", response_model=Referral)
def screen(
    referral_id: str,
    store: ReferralStore = Depends(get_referral_store),
    llm: LLMClient = Depends(get_llm),
) -> Referral:
    """Run the bounded screening call and update the referral accordingly."""
    referral = _require(store.get(referral_id), referral_id)
    result = screen_referral(llm, referral)
    return store.apply_screening(referral_id, result)


@router.post("/referrals/{referral_id}/assign", response_model=Referral)
def assign(
    referral_id: str,
    request: AssignReferralRequest,
    store: ReferralStore = Depends(get_referral_store),
) -> Referral:
    """Claim a referral for a worker, moving it to 'assigned'."""
    _require(store.get(referral_id), referral_id)
    return store.assign(referral_id, request.worker)


@router.post("/referrals/{referral_id}/start", response_model=Referral)
def start(referral_id: str, store: ReferralStore = Depends(get_referral_store)) -> Referral:
    """Mark a referral as in progress (the agent run has begun)."""
    _require(store.get(referral_id), referral_id)
    return store.mark_in_progress(referral_id)


@router.post("/referrals/{referral_id}/complete", response_model=Referral)
def complete(
    referral_id: str,
    request: CompleteReferralRequest,
    store: ReferralStore = Depends(get_referral_store),
) -> Referral:
    """Link the agent-generated case and move the referral to 'report_ready'."""
    _require(store.get(referral_id), referral_id)
    return store.link_case(referral_id, request.case_id)


@router.post("/referrals/{referral_id}/approve", response_model=Referral)
def approve(referral_id: str, store: ReferralStore = Depends(get_referral_store)) -> Referral:
    """Reflect the report's approval back onto the referral."""
    _require(store.get(referral_id), referral_id)
    return store.approve(referral_id)
