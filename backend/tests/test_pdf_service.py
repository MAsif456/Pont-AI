"""Tests for PDF text extraction, including graceful failure handling."""

import pytest

from config import BACKEND_ROOT
from core.pdf_service import PdfExtractionError, extract_text

_SAMPLE_PDF = BACKEND_ROOT / "data" / "sample_pdfs" / "gp_referral_pritchard.pdf"


def test_extracts_text_from_sample_pdf():
    text = extract_text(_SAMPLE_PDF.read_bytes())
    assert "Pritchard" in text
    assert len(text) > 100


def test_empty_bytes_raise_handled_error():
    with pytest.raises(PdfExtractionError):
        extract_text(b"")


def test_non_pdf_bytes_raise_handled_error():
    with pytest.raises(PdfExtractionError):
        extract_text(b"this is not a pdf at all")
