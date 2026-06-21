"""Mock handler for the GENERATE_REPORT task.

Assembles the narrative fields of a referral report from the agent's output.
The non-narrative structure (recommendations, discrepancies, the human-review
statement, plain-text rendering) is composed in Python by the report generator.
"""


def handle_report(payload: dict) -> dict:
    """Return the narrative fields of a referral report."""
    profile = payload.get("needs_profile") or {}
    name = payload.get("patient_name") or payload.get("patient_id") or "The patient"
    return {
        "patient_summary": _patient_summary(name, profile),
        "identified_needs": _identified_needs(profile),
        "flagged_risks": list(profile.get("key_risks", [])),
        "clinical_context_referenced": _clinical_text(payload.get("clinical_context")),
        "family_context_referenced": _family_text(payload.get("family_context")),
    }


def _patient_summary(name: str, profile: dict) -> str:
    return (
        f"{name} presents with {profile.get('dementia_stage', 'unspecified')} dementia, "
        f"{profile.get('living_situation', 'living situation unspecified')}, "
        f"{profile.get('mobility_needs', 'mobility unspecified')}, with "
        f"{profile.get('carer_status', 'carer status unspecified')}. "
        f"{profile.get('summary', '')}"
    ).strip()


def _identified_needs(profile: dict) -> list[str]:
    """Turn the profile into a flat list of identified needs for the report body."""
    needs = []
    if profile.get("mobility_needs"):
        needs.append(f"Mobility: {profile['mobility_needs']}")
    if profile.get("carer_status"):
        needs.append(f"Carer status: {profile['carer_status']}")
    needs.extend(profile.get("key_risks", []))
    return needs


def _clinical_text(clinical: dict | None) -> str:
    if not clinical:
        return ""
    tasks = clinical.get("outstanding_clinical_tasks") or []
    outstanding = "; ".join(tasks) if tasks else "none recorded"
    return (
        f"Clinical record (Clinical domain): {clinical.get('diagnosis_summary', '')} "
        f"Discharge readiness: {clinical.get('discharge_readiness_score', 'unknown')}. "
        f"Outstanding clinical tasks: {outstanding}."
    )


def _family_text(family: dict | None) -> str:
    if not family:
        return ""
    consent = "yes" if family.get("consent_on_file") else "no"
    return (
        f"Family record (Family domain): {family.get('family_preferences', '')} "
        f"Consent on file: {consent}. {family.get('transport_notes', '')}"
    )
