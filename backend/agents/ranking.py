"""Turns retrieved service candidates into ranked recommendations via the model."""

from core.json_utils import generate_json
from core.llm.base import LLMClient
from models.context import ClinicalContext, FamilyContext
from models.needs import Discrepancy, NeedsProfile
from models.referral import Recommendation
from models.service import RetrievedService

from .prompts import build_rank_prompt

_VALID_CONFIDENCE = {"high", "medium", "low"}


def rank_candidates(
    llm: LLMClient,
    profile: NeedsProfile,
    discrepancies: list[Discrepancy],
    candidates: list[RetrievedService],
    clinical: ClinicalContext | None,
    family: FamilyContext | None,
) -> list[Recommendation]:
    """Ask the model to rank candidates, returning validated recommendations."""
    if not candidates:
        return []
    payload = _rank_payload(profile, discrepancies, candidates, clinical, family)
    result = generate_json(llm, build_rank_prompt(payload))
    raw = result.get("recommendations", []) if isinstance(result, dict) else []
    return [_to_recommendation(item, index) for index, item in enumerate(raw)]


def _rank_payload(profile, discrepancies, candidates, clinical, family) -> dict:
    """Build the JSON payload the ranking prompt consumes."""
    return {
        "needs_profile": profile.model_dump(),
        "discrepancies": [d.model_dump() for d in discrepancies],
        "candidates": [
            {
                "service_id": hit.service.service_id,
                "name": hit.service.name,
                "category": hit.service.category,
                "description": hit.service.description,
                "eligibility_criteria": hit.service.eligibility_criteria,
                "distance": round(hit.distance, 4),
            }
            for hit in candidates
        ],
        "clinical_context": clinical.model_dump() if clinical else None,
        "family_context": family.model_dump() if family else None,
    }


def _to_recommendation(item: dict, index: int) -> Recommendation:
    """Validate one raw recommendation, defaulting confidence and review flags."""
    confidence = str(item.get("confidence", "medium")).lower()
    if confidence not in _VALID_CONFIDENCE:
        confidence = "medium"
    return Recommendation(
        service_id=str(item.get("service_id", "")),
        name=str(item.get("name", "")),
        category=str(item.get("category", "")),
        rank=int(item.get("rank", index + 1)),
        justification=str(item.get("justification", "")),
        confidence=confidence,
        # Trust an explicit flag, but always force it on for low confidence.
        recommended_for_human_review=bool(item.get("recommended_for_human_review", False))
        or confidence == "low",
    )
