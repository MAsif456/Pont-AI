"""Builds the dashboard caseload: each patient with a derived workflow status.

Joins the patient records with their referral and case, and maps the detailed
referral/case states onto the four patient-level statuses the dashboard shows
(Draft -> In Progress -> Pending Review -> Referred).
"""

from core.case_store import CaseStore
from core.clinical_update_store import ClinicalUpdateStore
from core.data_loader import load_patients
from core.interaction_store import InteractionStore
from core.referral_store import ReferralStore
from models.api import CaseloadRow, CaseloadStatus

# Referral statuses that count as active work in progress.
_IN_PROGRESS_REFERRAL = {"new", "screened", "assigned", "in_progress"}
_CLOSED_REFERRAL = {"closed_information_only", "closed_redirected"}


def build_caseload(
    referral_store: ReferralStore,
    case_store: CaseStore,
    clinical_store: ClinicalUpdateStore | None = None,
    interaction_store: InteractionStore | None = None,
) -> list[CaseloadRow]:
    """Return one row per patient, most recently updated first.

    When the clinical/interaction stores are supplied, each row also reports
    whether new updates or notes have arrived since the last review, so the
    dashboard can flag patients that need a reassessment.
    """
    referrals = {r.patient_id: r for r in referral_store.list_all() if r.patient_id}
    # Summaries are already most-recent-first, so the first seen is the latest case.
    cases = {}
    for summary in case_store.list_summaries():
        if summary.patient_id:
            cases.setdefault(summary.patient_id, summary)

    rows = [
        _row(
            patient,
            referrals.get(patient["patient_id"]),
            cases.get(patient["patient_id"]),
            clinical_store,
            interaction_store,
        )
        for patient in load_patients()
    ]
    return sorted(rows, key=lambda row: row.updated_at, reverse=True)


def _row(patient: dict, referral, case, clinical_store, interaction_store) -> CaseloadRow:
    due, reason = _reassessment_due(
        patient["patient_id"], referral, clinical_store, interaction_store
    )
    return CaseloadRow(
        patient_id=patient["patient_id"],
        name=patient.get("name", ""),
        age=patient.get("age"),
        postcode_area=patient.get("postcode_area", ""),
        dementia_type=patient.get("dementia_type", ""),
        diagnosis_stage=patient.get("diagnosis_stage", ""),
        status=_status(referral, case),
        updated_at=_updated_at(patient, referral, case),
        flagged=_flagged(referral, case),
        case_id=case.case_id if case else None,
        referral_id=referral.referral_id if referral else None,
        reassessment_due=due,
        flag_reason=reason,
    )


def _reassessment_due(
    patient_id: str, referral, clinical_store, interaction_store
) -> tuple[bool, str | None]:
    """True when updates/notes have arrived since the referral was last reviewed."""
    if referral is None or not referral.case_id:
        return False, None
    since = referral.clinical_reviewed_at
    updates = clinical_store.updates_since(patient_id, since) if clinical_store else []
    notes = interaction_store.logged_since(patient_id, since) if interaction_store else []
    if not updates and not notes:
        return False, None
    bits = []
    if updates:
        bits.append(f"{len(updates)} clinical update{'s' if len(updates) != 1 else ''}")
    if notes:
        bits.append(f"{len(notes)} new note{'s' if len(notes) != 1 else ''}")
    return True, " · ".join(bits)


def _status(referral, case) -> CaseloadStatus:
    """Map the most-advanced referral/case state to a patient-level status."""
    if (case and case.status == "approved") or (referral and referral.status == "approved"):
        return "referred"
    if (case and case.status == "pending_review") or (
        referral and referral.status == "report_ready"
    ):
        return "pending_review"
    if (case and case.status == "changes_requested") or (
        referral and referral.status in _IN_PROGRESS_REFERRAL
    ):
        return "in_progress"
    if referral and referral.status in _CLOSED_REFERRAL:
        return "referred"
    return "draft"


def _updated_at(patient: dict, referral, case) -> str:
    if case:
        return case.assessed_date
    if referral:
        return referral.referred_at
    date = patient.get("assessment_date", "")
    return f"{date}T00:00:00+00:00" if date else ""


def _flagged(referral, case) -> bool:
    has_discrepancy = bool(case and case.discrepancy_count > 0)
    return has_discrepancy or bool(referral and referral.verification_flag)
