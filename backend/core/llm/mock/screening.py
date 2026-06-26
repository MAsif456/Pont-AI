"""Mock handler for the SCREEN_REFERRAL task.

Classifies a referral by keyword and detects note disagreements via a small set
of opposing-signal themes, mirroring the offline heuristics used elsewhere.
"""

# Keyword sets per outcome. Redirect takes precedence (an explicit benefits/housing
# ask), then care needs, then general-information requests.
_REDIRECT = (
    "benefit", "housing", "rehous", "homeless", "debt", "money advice", "blue badge",
    "council tax", "pension", "financial", "grant", "universal credit",
)
_PROPORTIONATE = (
    "dementia", "fall", "personal care", "washing", "dressing", "carer", "care package",
    "safeguard", "unsafe", "memory", "confusion", "deteriorat", "mobility", "incontinen",
    "weight loss", "wandering", "neglect", "support at home", "needs assessment",
)
_INFORMATION = (
    "general advice", "general information", "information about", "what services",
    "what support", "leaflet", "just wondering", "general enquiry", "signpost", "find out",
)

# Opposing-signal themes for the electronic-vs-handover cross-check. A conflict is
# flagged when one note matches side A and the other matches side B (either way round).
_CONFLICT_THEMES = [
    {
        "label": "mobility (independent vs. now using a walking aid)",
        "a": ["independent", "independently mobile", "fully mobile", "walks unaided", "no mobility"],
        "b": ["walking frame", "walking aid", "zimmer", "uses a frame", "after a fall", "since a fall", "recent fall"],
    },
    {
        "label": "night-time settling (sleeps through vs. up at night)",
        "a": ["sleeping through", "sleeps through", "settled at night", "sleeps well"],
        "b": ["up all night", "awake all night", "up at night", "not sleeping", "disturbed nights"],
    },
    {
        "label": "personal care (independent vs. now needs help)",
        "a": ["independent with personal care", "manages personal care", "self-caring", "continent"],
        "b": ["needs help with washing", "help with personal care", "assistance with toileting", "incontinent"],
    },
    {
        "label": "eating and appetite",
        "a": ["eating well", "good appetite", "eats well"],
        "b": ["not eating", "poor appetite", "weight loss", "refusing food"],
    },
]


def handle_screen(payload: dict) -> dict:
    """Return outcome, rationale and verification_flag for SCREEN_REFERRAL."""
    reason = str(payload.get("reason_for_referral", "")).lower()
    outcome = _classify(reason)
    return {
        "outcome": outcome,
        "rationale": _rationale(outcome),
        "verification_flag": _verification_flag(
            payload.get("electronic_note"), payload.get("handover_note")
        ),
    }


def _classify(reason: str) -> str:
    if any(term in reason for term in _REDIRECT):
        return "redirect"
    if any(term in reason for term in _PROPORTIONATE):
        return "proportionate_assessment"
    if any(term in reason for term in _INFORMATION):
        return "information_only"
    # A vague request with no care signal is treated as information only.
    return "information_only"


def _rationale(outcome: str) -> str:
    return {
        "information_only": "Reads as a general request for advice or information; no assessment or onward referral needed.",
        "redirect": "The need clearly sits with another agency rather than adult social care; redirect accordingly.",
        "proportionate_assessment": "Concerns the person's ongoing care and support needs, so a proportionate needs assessment is warranted.",
    }[outcome]


def _verification_flag(electronic: str | None, handover: str | None) -> str | None:
    """Flag the first factual disagreement found between the two notes."""
    if not electronic or not handover:
        return None
    electronic_text, handover_text = electronic.lower(), handover.lower()
    for theme in _CONFLICT_THEMES:
        if _conflicts(electronic_text, handover_text, theme):
            return (
                f"Electronic record and handover note disagree on {theme['label']} -- "
                "please verify before assessment."
            )
    return None


def _conflicts(electronic: str, handover: str, theme: dict) -> bool:
    """True if the two notes land on opposite sides of a theme."""
    electronic_a = any(signal in electronic for signal in theme["a"])
    electronic_b = any(signal in electronic for signal in theme["b"])
    handover_a = any(signal in handover for signal in theme["a"])
    handover_b = any(signal in handover for signal in theme["b"])
    return (electronic_a and handover_b) or (electronic_b and handover_a)
