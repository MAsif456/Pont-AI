"""Tool: extract_needs -- turn patient input into a structured needs profile.

MCP manifest entry:
    name: extract_needs
    description: Extract a structured dementia needs profile from form data,
                 free text, and one or more source notes, flagging any
                 disagreements between sources.
    parameters:
        patient_data (object, optional): structured intake fields
        raw_text (string, optional): free text, e.g. extracted from a PDF
        source_notes (array, optional): [{source, text}] accounts to reconcile
"""

import json

from core.json_utils import generate_json
from core.llm.base import LLMClient
from models.needs import Discrepancy, NeedsProfile, NeedsResult, PatientDetails
from models.patient import SourceNoteInput

_PROMPT_TEMPLATE = """TASK: EXTRACT_NEEDS
You are a social-care needs-assessment assistant. Read the patient information \
below (structured fields, free text, and any source notes) and extract a \
structured needs profile. The free text may be a full assessment document (for \
example an NHS Continuing Healthcare Decision Support Tool); read it carefully \
and pull the individual's details out of it.

Return JSON ONLY (no prose, no code fences) with exactly these keys:
- dementia_stage: string (mild, moderate, severe, or unspecified)
- mobility_needs: string
- living_situation: string
- carer_status: string
- key_risks: array of short strings
- summary: string (a plain-language summary of the patient's needs)
- patient_details: object describing who the individual is, with these keys \
(use "" for anything the document does not state -- never guess):
    - name: string (the individual's full name, not a file name)
    - age: string (their age in years; derive it from a date of birth if needed)
    - postcode_area: string (the outward part of their home postcode, e.g. "LS8")
    - dementia_type: string (e.g. "Alzheimer's", "vascular"; "" if not a dementia)
    - diagnosis_stage: string (e.g. "moderate", "moderate-to-severe")
    - living_situation: string (e.g. "lives alone", "residential care home")
    - carer_present: string ("Yes", "No", or "")
    - mobility: string (a short phrase, e.g. "wheelchair and zimmer frame")
- discrepancies: array of objects, each {{"sources": [string], "description": string}}

When two or more source notes disagree on a specific point (for example, one says \
the patient needs help washing and dressing while another says no help is \
required), flag it explicitly in discrepancies rather than silently choosing one. \
If the sources broadly agree, return an empty array.

INPUT:
{payload}"""


def extract_needs(
    llm: LLMClient,
    patient_data: dict | None = None,
    raw_text: str | None = None,
    source_notes: list[SourceNoteInput] | None = None,
) -> NeedsResult:
    """Extract a structured needs profile and any source discrepancies.

    Returns a validated :class:`NeedsResult`; the JSON-or-retry handling lives in
    ``generate_json`` so a single malformed response does not crash the pipeline.
    """
    payload = _build_payload(patient_data, raw_text, source_notes or [])
    result = generate_json(llm, _PROMPT_TEMPLATE.format(payload=payload))
    return _to_needs_result(result if isinstance(result, dict) else {})


def _build_payload(patient_data: dict | None, raw_text: str | None, notes: list) -> str:
    """Serialise the tool inputs into the JSON block the model reads."""
    return json.dumps(
        {
            "structured": patient_data or {},
            "raw_text": raw_text or "",
            "sources": [
                {"source": note.source, "text": note.text} for note in notes
            ],
        }
    )


def _to_needs_result(result: dict) -> NeedsResult:
    """Validate raw model output into typed models, tolerating missing keys."""
    profile = NeedsProfile(
        dementia_stage=str(result.get("dementia_stage", "")),
        mobility_needs=str(result.get("mobility_needs", "")),
        living_situation=str(result.get("living_situation", "")),
        carer_status=str(result.get("carer_status", "")),
        key_risks=[str(risk) for risk in result.get("key_risks", [])],
        summary=str(result.get("summary", "")),
        patient_details=_to_patient_details(result.get("patient_details")),
    )
    discrepancies = [
        Discrepancy(
            sources=[str(source) for source in item.get("sources", [])],
            description=str(item.get("description", "")),
        )
        for item in result.get("discrepancies", [])
        if isinstance(item, dict)
    ]
    return NeedsResult(profile=profile, discrepancies=discrepancies)


def _to_patient_details(raw: object) -> PatientDetails:
    """Coerce the model's patient_details object into typed fields, all strings."""
    data = raw if isinstance(raw, dict) else {}
    fields = PatientDetails.model_fields
    return PatientDetails(**{key: str(data.get(key, "")) for key in fields})
