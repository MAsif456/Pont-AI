"""Mock handler for the SYNTHESISE_CARE_PLAN task.

Reconciles the three domains heuristically: a delay is recommended when clinical
readiness is pending, tasks are outstanding, or a material clinical change has
arrived; cross-domain flags catch gaps between domains.
"""

# Clinical fields whose recent change should gate discharge.
_MATERIAL_FIELDS = ("medication", "mobility", "discharge_readiness", "diagnosis")
# Risk words that conflict with a stated home-care preference.
_SAFETY_RISKS = ("falls", "safeguard", "fire", "wandering", "self-neglect", "unsafe")


def handle_care_plan(payload: dict) -> dict:
    """Return the narrative + cross-domain reconciliation for a care plan."""
    clinical = payload.get("clinical") or {}
    family = payload.get("family") or {}
    needs = payload.get("needs_profile") or {}
    recommendations = payload.get("recommendations", [])

    delays = _delay_reasons(clinical)
    discharge = (
        "Discharge should be delayed pending: " + "; ".join(delays)
        if delays
        else "Ready for discharge with the support plan below."
    )
    return {
        "discharge_recommendation": discharge,
        "summary": _summary(needs, bool(delays), bool(recommendations)),
        "clinical_considerations": _clinical_points(clinical),
        "family_considerations": _family_points(family),
        "cross_domain_flags": _flags(clinical, family, needs, recommendations),
    }


def _delay_reasons(clinical: dict) -> list[str]:
    reasons: list[str] = []
    readiness = str(clinical.get("discharge_readiness_score", "")).lower()
    if any(term in readiness for term in ("pending", "not yet", "not assessed", "awaiting", "reassess")):
        reasons.append(f"clinical readiness is '{clinical.get('discharge_readiness_score')}'")
    reasons.extend(clinical.get("outstanding_clinical_tasks", []) or [])
    for update in clinical.get("clinical_updates", []) or []:
        if any(field in str(update.get("field_changed", "")).lower() for field in _MATERIAL_FIELDS):
            reasons.append(f"recent change to {update.get('field_changed')} needs review")
    # De-duplicate while preserving order, and keep the plan readable.
    return list(dict.fromkeys(reasons))[:3]


def _summary(needs: dict, delayed: bool, has_services: bool) -> str:
    stage = needs.get("dementia_stage", "unspecified")
    living = needs.get("living_situation", "living situation unspecified")
    tail = "with a recommended support package" if has_services else "though no package is yet recommended"
    head = "Discharge is not yet advised" if delayed else "Discharge can proceed"
    return (
        f"{head} for this patient with {stage} dementia, {living}, {tail}. "
        "Clinical, social care and family information have been reconciled below."
    )


def _clinical_points(clinical: dict) -> list[str]:
    if not clinical:
        return []
    points = [f"Discharge readiness: {clinical.get('discharge_readiness_score', 'unknown')}"]
    points.extend(clinical.get("outstanding_clinical_tasks", []) or [])
    for update in clinical.get("clinical_updates", []) or []:
        points.append(
            f"Recent update: {update.get('field_changed')} -> {update.get('new_value')} "
            f"(per {update.get('source')})"
        )
    return points


def _family_points(family: dict) -> list[str]:
    if not family:
        return []
    consent = "yes" if family.get("consent_on_file") else "no"
    points = [f"Consent on file: {consent}"]
    if family.get("family_preferences"):
        points.append(family["family_preferences"])
    if family.get("transport_notes"):
        points.append(family["transport_notes"])
    return points


def _flags(clinical: dict, family: dict, needs: dict, recommendations: list) -> list[dict]:
    flags: list[dict] = []
    readiness = str(clinical.get("discharge_readiness_score", "")).strip().lower()
    if readiness == "ready" and not recommendations:
        flags.append({
            "description": "Clinical indicates readiness, but no social care package is recommended yet.",
            "domains": ["Clinical", "Social Care"],
        })
    if family and family.get("consent_on_file") is False:
        flags.append({"description": "Family consent is not yet on file.", "domains": ["Family"]})
    prefers_home = "home" in str(family.get("family_preferences", "")).lower()
    risk_text = f"{' '.join(needs.get('key_risks', []))} {needs.get('summary', '')}".lower()
    if prefers_home and any(risk in risk_text for risk in _SAFETY_RISKS):
        flags.append({
            "description": "Family prefers home-based care, but the assessment flags safety risks to mitigate.",
            "domains": ["Family", "Social Care"],
        })
    if clinical.get("clinical_updates"):
        flags.append({
            "description": "A recent clinical update may change the plan — verify before discharge.",
            "domains": ["Clinical"],
        })
    return flags
