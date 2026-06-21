"""Mock handlers for the agent's planning (AGENT_PLAN) and ranking (RANK_REFERRALS).

The planner decides which service categories to search and when to stop; the
ranker turns retrieved candidates into ordered recommendations with confidence.
Both are deterministic so the agent loop behaves predictably in tests and demos.
"""

from .keywords import CATEGORY_QUERY, RISK_TO_CATEGORIES

# Default categories for a dementia patient when no specific risk maps cleanly,
# so the agent always has something sensible to search for.
_FALLBACK_CATEGORIES = ["memory support", "day centre"]


def handle_plan(payload: dict) -> dict:
    """Decide the next action: search more categories, or finalise."""
    profile = payload.get("needs_profile") or {}
    discrepancies = payload.get("discrepancies") or []
    history = payload.get("history") or []
    remaining_budget = int(payload.get("remaining_tool_calls", 0))
    available = payload.get("available_categories") or []

    needed = _needed_categories(profile, available)
    searched = {entry.get("category") for entry in history}
    remaining = [category for category in needed if category not in searched]
    is_complex = _is_complex(profile, discrepancies, needed)

    if not history:
        return _search_action(remaining[:1] or needed[:1], is_complex, first=True)
    if is_complex and remaining and remaining_budget > 0:
        return _search_action(remaining[:1], is_complex, first=False)
    return _finalise_action(searched, is_complex)


def _needed_categories(profile: dict, available: list[str]) -> list[str]:
    """Ordered, de-duplicated categories worth searching for this profile."""
    ordered: list[str] = []
    for risk in profile.get("key_risks", []):
        for category in RISK_TO_CATEGORIES.get(risk, []):
            if category not in ordered:
                ordered.append(category)
    if profile.get("dementia_stage") == "mild":
        ordered = ["memory support", *ordered]
    if not ordered:
        ordered = list(_FALLBACK_CATEGORIES)
    if available:
        filtered = [category for category in ordered if category in available]
        ordered = filtered or ordered
    return ordered


def _is_complex(profile: dict, discrepancies: list, needed: list[str]) -> bool:
    """A case is complex if sources conflict, the stage is severe, or needs are broad."""
    return bool(discrepancies) or profile.get("dementia_stage") == "severe" or len(needed) >= 3


def _search_action(categories: list[str], is_complex: bool, first: bool) -> dict:
    searches = [{"category": c, "query": CATEGORY_QUERY.get(c, c)} for c in categories]
    stage = "Starting" if first else "Continuing"
    reason = (
        f"{stage} retrieval for the {', '.join(categories)} "
        f"{'categories' if len(categories) != 1 else 'category'} based on the "
        f"patient's needs{' (complex case, broadening the search)' if is_complex and not first else ''}."
    )
    return {"reasoning": reason, "action": "search", "searches": searches}


def _finalise_action(searched: set, is_complex: bool) -> dict:
    reason = (
        f"Searched {len(searched)} categor{'ies' if len(searched) != 1 else 'y'}; "
        f"{'complex case but coverage is now sufficient' if is_complex else 'straightforward case, no further searches needed'}. "
        "Finalising recommendations."
    )
    return {"reasoning": reason, "action": "finalise", "searches": []}


def handle_rank(payload: dict) -> dict:
    """Order candidates by similarity and attach confidence and justification."""
    profile = payload.get("needs_profile") or {}
    candidates = sorted(payload.get("candidates", []), key=lambda c: c.get("distance", 1.0))
    recommendations = [
        _recommendation(candidate, index, profile)
        for index, candidate in enumerate(candidates[:5])
    ]
    return {"recommendations": recommendations}


def _recommendation(candidate: dict, index: int, profile: dict) -> dict:
    confidence = _confidence_for_rank(index)
    return {
        "service_id": candidate.get("service_id", ""),
        "name": candidate.get("name", ""),
        "category": candidate.get("category", ""),
        "rank": index + 1,
        "justification": _justification(candidate, profile, confidence),
        "confidence": confidence,
        "recommended_for_human_review": confidence == "low",
    }


def _confidence_for_rank(index: int) -> str:
    """Top picks are high confidence; the tail is flagged low for human review."""
    if index < 2:
        return "high"
    if index < 4:
        return "medium"
    return "low"


def _justification(candidate: dict, profile: dict, confidence: str) -> str:
    risks = profile.get("key_risks", [])
    risk_phrase = risks[0] if risks else "their assessed needs"
    stage = profile.get("dementia_stage", "their")
    first_sentence = candidate.get("description", "").split(". ")[0].strip()
    return (
        f"This {candidate.get('category', 'service')} option suits a patient with "
        f"{stage} dementia and {risk_phrase}. {first_sentence}. "
        f"Matched at {confidence} confidence for coordinator review."
    )
