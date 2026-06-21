"""Extracts plain text from an uploaded PDF.

Real referral letters produce messy, sometimes empty, text. The goal here is to
get whatever text we can without ever letting a malformed PDF crash the request --
callers receive text (possibly empty) or a clear, handled error.
"""

from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PyPdfError


class PdfExtractionError(ValueError):
    """Raised when a file cannot be opened as a PDF at all."""


def extract_text(data: bytes) -> str:
    """Return the concatenated text of every page in the PDF.

    Individual pages that fail to parse are skipped rather than aborting the
    whole extraction, so a single bad page does not lose the rest of the letter.
    """
    if not data:
        raise PdfExtractionError("The uploaded file was empty.")
    try:
        reader = PdfReader(BytesIO(data))
    except (PyPdfError, OSError, ValueError) as error:
        raise PdfExtractionError("The file could not be read as a PDF.") from error

    pages = [_safe_page_text(page) for page in reader.pages]
    return "\n".join(text for text in pages if text).strip()


def _safe_page_text(page) -> str:
    """Extract one page's text, returning an empty string if it cannot be parsed."""
    try:
        return page.extract_text() or ""
    except Exception:
        # A single unreadable page must not abort extraction of the rest.
        return ""
