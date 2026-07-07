"""Mock handler for the EXTRACT_NEEDS task.

Derives a needs profile from free text and structured fields, and detects
discrepancies between sources using a small set of opposing-signal themes that
mirror the kinds of conflict written into the synthetic dataset.
"""

from .keywords import RISK_SIGNALS

# Each theme pairs phrases asserting a need against phrases denying it. When one
# source matches the "asserts" side and another the "denies" side, that is a
# genuine disagreement worth flagging.
_CONFLICT_THEMES: list[dict] = [
    {
        "label": "whether the patient needs help with personal care (washing and dressing)",
        "asserts": ["help washing", "washing and dressing", "hands-on help", "help with personal care", "help with his personal care"],
        "denies": ["independent with personal care", "independent with all personal care", "independent with all care", "no assistance required"],
    },
    {
        "label": "night-time wandering and exit-seeking",
        "asserts": ["wandering", "tries to leave", "leave the house", "front door at", "with his coat on"],
        "denies": ["settled", "no attempts to leave", "have not observed", "not observed"],
    },
    {
        "label": "eating and nutrition",
        "asserts": ["eats really well", "eats well", "finishes most meals", "no problem with her eating"],
        "denies": ["weight loss", "malnutrition", "refuses meals", "poor intake"],
    },
    {
        "label": "how much supervision the patient needs",
        "asserts": ["every minute", "can't be left alone", "cannot be left", "watch him"],
        "denies": ["unsupervised", "without incident", "more than is strictly required"],
    },
    {
        "label": "whether the patient needs help at all",
        "asserts": ["needs daily support", "needs help", "gone downhill", "won't let carers"],
        "denies": ["manages perfectly well", "does not want", "manages well"],
    },
]


def handle_extract(payload: dict) -> dict:
    """Return a needs profile plus discrepancies for the EXTRACT_NEEDS task."""
    sources = payload.get("sources", [])
    structured = payload.get("structured") or {}
    combined = _combined_text(sources, structured, payload.get("raw_text", ""))

    return {
        "dementia_stage": _stage(structured, combined),
        "mobility_needs": _mobility(structured, combined),
        "living_situation": _living(structured, combined),
        "carer_status": _carer(structured, combined),
        "key_risks": _risks(combined),
        "summary": _summary(structured, combined),
        "patient_details": _patient_details(structured, combined),
        "discrepancies": _discrepancies(sources),
    }


def _patient_details(structured: dict, text: str) -> dict:
    """Build the identity/demographic summary from structured fields and text.

    Mirrors the live extractor's ``patient_details`` shape. Structured intake
    fields win; the free text only fills gaps so an uploaded document still
    yields a usable summary in mock mode.
    """
    carer = _carer(structured, text)
    return {
        "name": str(structured.get("name", "")),
        "age": str(structured.get("age", "")),
        "postcode_area": str(structured.get("postcode_area", "")),
        "dementia_type": str(structured.get("dementia_type", "")),
        "diagnosis_stage": _stage(structured, text),
        "living_situation": _living(structured, text),
        "carer_present": "Yes" if carer == "carer present" else "No" if carer == "no carer present" else "",
        "mobility": _mobility(structured, text),
    }


def _combined_text(sources: list[dict], structured: dict, raw_text: str) -> str:
    """Lowercased concatenation of every text signal available about the patient."""
    parts = [note.get("text", "") for note in sources]
    parts += [str(structured.get(field, "")) for field in ("cognitive_notes", "carer_notes", "current_support")]
    parts.append(raw_text or "")
    return " ".join(parts).lower()


def _stage(structured: dict, text: str) -> str:
    if structured.get("diagnosis_stage"):
        return str(structured["diagnosis_stage"])
    for stage in ("severe", "moderate", "mild"):
        if stage in text:
            return stage
    return "unspecified"


def _mobility(structured: dict, text: str) -> str:
    if structured.get("mobility"):
        return str(structured["mobility"])
    if "wheelchair" in text:
        return "wheelchair user"
    if "walking aid" in text or "walking frame" in text or "frame" in text:
        return "uses walking aid"
    return "independent"


def _living(structured: dict, text: str) -> str:
    if structured.get("living_situation"):
        return str(structured["living_situation"])
    if "lives alone" in text or "alone" in text:
        return "lives alone"
    if "spouse" in text or "wife" in text or "husband" in text:
        return "lives with spouse"
    if "family" in text or "son" in text or "daughter" in text:
        return "lives with family"
    return "unspecified"


def _carer(structured: dict, text: str) -> str:
    if structured.get("carer_present") is not None:
        return "carer present" if structured["carer_present"] else "no carer present"
    if "no carer" in text or "no live-in carer" in text:
        return "no carer present"
    if "carer" in text or "wife" in text or "husband" in text or "daughter" in text:
        return "carer present"
    return "unspecified"


def _risks(text: str) -> list[str]:
    """Collect canonical risk labels mentioned anywhere in the text, in order."""
    found: list[str] = []
    for phrase, label in RISK_SIGNALS.items():
        if phrase in text and label not in found:
            found.append(label)
    return found


def _summary(structured: dict, text: str) -> str:
    risks = _risks(text)
    risk_text = ", ".join(risks) if risks else "no specific risks identified"
    return (
        f"{_stage(structured, text).capitalize()} dementia; "
        f"{_living(structured, text)}; {_mobility(structured, text)}; "
        f"{_carer(structured, text)}. Key risks: {risk_text}."
    )


def _discrepancies(sources: list[dict]) -> list[dict]:
    """Flag themes where one source asserts a need another source denies."""
    discrepancies: list[dict] = []
    if len(sources) < 2:
        return discrepancies
    for theme in _CONFLICT_THEMES:
        asserting = _sources_matching(sources, theme["asserts"])
        denying = _sources_matching(sources, theme["denies"])
        if asserting and denying:
            involved = sorted(set(asserting) | set(denying))
            discrepancies.append(
                {
                    "sources": involved,
                    "description": (
                        f"Sources disagree on {theme['label']}: "
                        f"{' and '.join(asserting)} indicate a need, "
                        f"while {' and '.join(denying)} do not."
                    ),
                }
            )
    return discrepancies


def _sources_matching(sources: list[dict], phrases: list[str]) -> list[str]:
    """Names of sources whose text contains any of the given phrases."""
    names = []
    for note in sources:
        text = note.get("text", "").lower()
        if any(phrase in text for phrase in phrases):
            names.append(note.get("source", "unknown source"))
    return names
