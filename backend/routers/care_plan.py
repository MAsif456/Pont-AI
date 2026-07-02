"""Endpoint: POST /care-plan -- the orchestration layer's Dynamic Care Plan.

Reconciles a case's social-care assessment with the latest clinical and family
context into one plan. Fetches *fresh* clinical context (including any new
updates) so the plan reflects the current picture, and versions by assessment
count so re-runs visibly produce a new plan.
"""

from fastapi import APIRouter, Depends, HTTPException

from core.care_plan import synthesise_care_plan
from core.case_store import CaseStore
from core.clinical_update_store import ClinicalUpdateStore
from core.llm.base import LLMClient
from models.care_plan import CarePlan, CarePlanRequest
from tools.context_lookup import get_family_context

from .dependencies import get_case_store, get_clinical_update_store, get_llm

router = APIRouter(tags=["care-plan"])


@router.post("/care-plan", response_model=CarePlan)
def create_care_plan(
    request: CarePlanRequest,
    cases: CaseStore = Depends(get_case_store),
    clinical_store: ClinicalUpdateStore = Depends(get_clinical_update_store),
    llm: LLMClient = Depends(get_llm),
) -> CarePlan:
    """Synthesise a dynamic care plan for an existing case."""
    case = cases.get(request.case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Unknown case id: {request.case_id}")

    agent_result = case.latest.agent_result
    clinical = clinical_store.get_context(case.patient_id) if case.patient_id else None
    family = get_family_context(case.patient_id) if case.patient_id else None
    return synthesise_care_plan(
        llm, agent_result, clinical, family, case.patient_name, version=len(case.assessments)
    )
