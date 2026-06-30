"""Mock handler for the ASSESS_UPDATE_IMPACT task.

Treats changes to material clinical fields (or values carrying decline/increase
signals) as significant -- warranting a re-run -- and everything else as minor.
"""

# Fields whose change is inherently material to discharge planning.
_SIGNIFICANT_FIELDS = (
    "medication", "mobility", "discharge_readiness", "diagnosis",
)
# Value signals that imply a meaningful change even on a softer field.
_IMPACT_KEYWORDS = (
    "increase", "decline", "frame", "wheelchair", "fall", "not ready", "delay",
    "worsen", "deteriorat", "twice", "three times", "reduced", "unsteady",
    "more frequent", "no longer",
)


def handle_impact(payload: dict) -> dict:
    """Return an impact assessment for the supplied clinical updates."""
    updates = payload.get("clinical_updates", [])
    significant = _is_significant(updates)
    return {
        "summary": _summary(updates),
        "affects_discharge": significant,
        "discharge_impact": (
            "This change may affect discharge readiness and should be reviewed before discharge."
            if significant
            else "This change does not materially affect discharge readiness."
        ),
        "recommend_rerun": significant,
        "recommendation_note": (
            "Existing recommendations should be re-run to reflect the change."
            if significant
            else "Existing recommendations still hold; no re-run needed."
        ),
    }


def _is_significant(updates: list[dict]) -> bool:
    for update in updates:
        field = str(update.get("field_changed", "")).lower()
        value = str(update.get("new_value", "")).lower()
        if any(name in field for name in _SIGNIFICANT_FIELDS):
            return True
        if any(keyword in f"{field} {value}" for keyword in _IMPACT_KEYWORDS):
            return True
    return False


def _summary(updates: list[dict]) -> str:
    if not updates:
        return "No new clinical updates to report."
    parts = [
        f"{update.get('field_changed', 'field')} changed from "
        f"'{update.get('previous_value', '')}' to '{update.get('new_value', '')}' "
        f"(per {update.get('source', 'clinical staff')})"
        for update in updates
    ]
    return "; ".join(parts)
