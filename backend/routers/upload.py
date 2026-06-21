"""Endpoint: POST /upload-document -- PDF text extraction into needs extraction."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.llm.base import LLMClient
from core.pdf_service import PdfExtractionError, extract_text
from models.api import UploadDocumentResponse
from tools.extract_needs import extract_needs

from .dependencies import get_llm

router = APIRouter(tags=["pipeline"])

# Below this many characters the extraction is almost certainly incomplete.
_MIN_USEFUL_CHARS = 30


@router.post("/upload-document", response_model=UploadDocumentResponse)
async def upload_document(
    file: UploadFile = File(...), llm: LLMClient = Depends(get_llm)
) -> UploadDocumentResponse:
    """Extract text from an uploaded PDF and run needs extraction over it."""
    _reject_non_pdf(file)
    text = _extract_or_422(await file.read())
    warning = (
        "Very little text could be extracted; the profile may be incomplete."
        if len(text) < _MIN_USEFUL_CHARS
        else None
    )
    needs = extract_needs(llm, raw_text=text)
    return UploadDocumentResponse(
        raw_text=text,
        characters_extracted=len(text),
        needs=needs,
        warning=warning,
    )


def _reject_non_pdf(file: UploadFile) -> None:
    """Reject obvious non-PDF uploads early with a clear client error."""
    filename = file.filename or ""
    if file.content_type != "application/pdf" and not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")


def _extract_or_422(data: bytes) -> str:
    """Extract text, converting an unreadable PDF into a handled 422 response."""
    try:
        return extract_text(data)
    except PdfExtractionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
