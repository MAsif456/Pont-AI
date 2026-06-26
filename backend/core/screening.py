"""Referral screening: a single, bounded structured LLM call.

Deliberately NOT agentic -- it has no tools and never calls other steps. It reads
one referral and returns a triage outcome plus, where two notes exist, a flag for
any factual disagreement between them. That is the whole of its job.
"""

import json

from core.json_utils import generate_json
from core.llm.base import LLMClient
from models.referral_intake import Referral, ScreeningResult

_VALID_OUTCOMES = {"information_only", "redirect", "proportionate_assessment"}

_PROMPT = """TASK: SCREEN_REFERRAL
You are an adult social-care referral screening assistant. Read the referral below \
and do TWO things in a single response.

1. Classify the referral into EXACTLY ONE outcome:
   - "information_only": a general request for advice or information that needs no assessment or onward referral.
   - "redirect": the need clearly belongs to another agency (e.g. benefits, housing, debt, blue badge), not adult social care.
   - "proportionate_assessment": it concerns a person's ongoing care or support needs (e.g. dementia, falls, personal care, carer strain, safeguarding) and warrants a proportionate needs assessment.
   Give a one or two sentence plain-language rationale.

2. If BOTH an electronic note and a paper/handover note are provided, compare them \
for any factual disagreement (for example, one says independent mobility while the \
other says a walking frame is now used). Describe any conflict in plain language in \
"verification_flag". If there is no conflict, or a note is missing, set it to null.

Return JSON ONLY (no prose, no code fences):
{{"outcome": "information_only"|"redirect"|"proportionate_assessment", "rationale": string, "verification_flag": string or null}}

INPUT:
{payload}"""


def screen_referral(llm: LLMClient, referral: Referral) -> ScreeningResult:
    """Classify a referral and flag any note disagreement in one bounded call."""
    payload = json.dumps(
        {
            "source": referral.source,
            "reason_for_referral": referral.reason_for_referral,
            "electronic_note": referral.electronic_note,
            "handover_note": referral.handover_note,
        }
    )
    result = generate_json(llm, _PROMPT.format(payload=payload))
    result = result if isinstance(result, dict) else {}
    return _to_screening_result(result)


def _to_screening_result(result: dict) -> ScreeningResult:
    """Validate the model output, defaulting to assessment if the outcome is unclear."""
    outcome = str(result.get("outcome", "")).strip()
    if outcome not in _VALID_OUTCOMES:
        # Prefer assessing over silently dropping a referral.
        outcome = "proportionate_assessment"
    flag = result.get("verification_flag")
    return ScreeningResult(
        outcome=outcome,
        rationale=str(result.get("rationale", "")),
        verification_flag=str(flag) if flag else None,
    )
