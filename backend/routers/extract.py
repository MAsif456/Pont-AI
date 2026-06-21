"""Endpoint: POST /extract-needs -- the needs-extraction tool over HTTP."""

from fastapi import APIRouter, Depends

from core.llm.base import LLMClient
from models.api import ExtractNeedsRequest
from models.needs import NeedsResult
from tools.extract_needs import extract_needs

from .dependencies import get_llm

router = APIRouter(tags=["pipeline"])


@router.post("/extract-needs", response_model=NeedsResult)
def extract_needs_endpoint(
    request: ExtractNeedsRequest, llm: LLMClient = Depends(get_llm)
) -> NeedsResult:
    """Extract a structured needs profile and any source discrepancies."""
    patient_data = request.patient_data.model_dump() if request.patient_data else None
    return extract_needs(
        llm,
        patient_data=patient_data,
        raw_text=request.raw_text,
        source_notes=request.source_notes,
    )
