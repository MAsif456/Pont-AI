"""Endpoint: POST /generate-report -- builds a referral report from agent output."""

from fastapi import APIRouter, Depends

from core.llm.base import LLMClient
from core.report_generator import generate_report
from models.api import GenerateReportRequest
from models.report import ReferralReport

from .dependencies import get_llm

router = APIRouter(tags=["pipeline"])


@router.post("/generate-report", response_model=ReferralReport)
def generate_report_endpoint(
    request: GenerateReportRequest, llm: LLMClient = Depends(get_llm)
) -> ReferralReport:
    """Generate a structured referral report plus a plain-text rendering."""
    return generate_report(llm, request.agent_result, request.patient_name)
