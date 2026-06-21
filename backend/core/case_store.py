"""Lightweight JSON-file store for persisted referral cases.

Not a database -- a single JSON file is enough for this prototype. Reads and
writes are guarded by a lock because FastAPI runs sync endpoints in a thread
pool, so concurrent requests could otherwise race on the read-modify-write.
"""

import json
import threading
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from config import get_settings
from models.case import (
    CaseStats,
    CaseStatus,
    CaseSummary,
    PatientCase,
    StoredAssessment,
)
from models.referral import AgentResult
from models.report import ReferralReport

_LOCK = threading.Lock()


def _now() -> datetime:
    return datetime.now(UTC)


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _parse(iso: str) -> datetime | None:
    """Parse an ISO timestamp, treating any naive value as UTC."""
    try:
        parsed = datetime.fromisoformat(iso)
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


class CaseStore:
    """Persists patient cases and their assessment history to a JSON file."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path or (get_settings().data_dir / "cases.json")

    def _load(self) -> list[PatientCase]:
        if not self._path.exists():
            return []
        with self._path.open(encoding="utf-8") as handle:
            return [PatientCase.model_validate(record) for record in json.load(handle)]

    def _write(self, cases: list[PatientCase]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("w", encoding="utf-8") as handle:
            json.dump([case.model_dump() for case in cases], handle, indent=2, ensure_ascii=False)

    def add_assessment(
        self,
        patient_id: str | None,
        patient_name: str,
        agent_result: AgentResult,
        report: ReferralReport,
        created_at: str | None = None,
        status: CaseStatus = "pending_review",
    ) -> tuple[str, str]:
        """Append an assessment to a patient's case, creating the case if new.

        Known patients (by ``patient_id``) accumulate history on one case; raw
        intakes without an id always start a fresh case. ``created_at`` and
        ``status`` are overridable so the seed script can place believable,
        already-reviewed assessments across time; live runs use the defaults.
        """
        with _LOCK:
            cases = self._load()
            assessment = StoredAssessment(
                assessment_id=_new_id(), created_at=created_at or _now().isoformat(),
                status=status, agent_result=agent_result, report=report,
            )
            case = _find_for_patient(cases, patient_id)
            if case is None:
                case = PatientCase(
                    case_id=_new_id(), patient_id=patient_id,
                    patient_name=patient_name or "Unnamed patient",
                    created_at=assessment.created_at, updated_at=assessment.created_at,
                    assessments=[assessment],
                )
                cases.append(case)
            else:
                case.assessments.append(assessment)
                case.updated_at = assessment.created_at
                if patient_name:
                    case.patient_name = patient_name
            self._write(cases)
            return case.case_id, assessment.assessment_id

    def list_summaries(self) -> list[CaseSummary]:
        """Return case summaries, most recently updated first."""
        cases = sorted(self._load(), key=lambda case: case.updated_at, reverse=True)
        return [_summarise(case) for case in cases]

    def get(self, case_id: str) -> PatientCase | None:
        return next((case for case in self._load() if case.case_id == case_id), None)

    def update_latest_status(
        self, case_id: str, status: CaseStatus, note: str = ""
    ) -> PatientCase | None:
        """Set the review status (and optional note) on a case's latest assessment."""
        with _LOCK:
            cases = self._load()
            case = next((c for c in cases if c.case_id == case_id), None)
            if case is None:
                return None
            case.latest.status = status
            case.latest.note = note
            case.updated_at = _now().isoformat()
            self._write(cases)
            return case

    def stats(self) -> CaseStats:
        """Compute team-level aggregate figures across all cases."""
        cases = self._load()
        now = _now()
        week_ago = now - timedelta(days=7)
        stats = CaseStats(total_cases=len(cases))
        for case in cases:
            _accumulate_case_stats(stats, case, now, week_ago)
        return stats


def _find_for_patient(cases: list[PatientCase], patient_id: str | None) -> PatientCase | None:
    if not patient_id:
        return None
    return next((case for case in cases if case.patient_id == patient_id), None)


def _summarise(case: PatientCase) -> CaseSummary:
    latest = case.latest
    recommendations = latest.agent_result.recommendations
    top = recommendations[0] if recommendations else None
    return CaseSummary(
        case_id=case.case_id, patient_id=case.patient_id, patient_name=case.patient_name,
        assessed_date=latest.created_at, status=latest.status,
        top_service=top.name if top else None,
        top_category=top.category if top else None,
        top_confidence=top.confidence if top else None,
        discrepancy_count=len(latest.agent_result.discrepancies),
        assessment_count=len(case.assessments),
    )


def _accumulate_case_stats(
    stats: CaseStats, case: PatientCase, now: datetime, week_ago: datetime
) -> None:
    latest = case.latest
    setattr(stats, latest.status, getattr(stats, latest.status) + 1)
    if latest.agent_result.discrepancies:
        stats.discrepancies_flagged += 1
    for assessment in case.assessments:
        created = _parse(assessment.created_at)
        if not created:
            continue
        if created.year == now.year and created.month == now.month:
            stats.assessed_this_month += 1
        if created >= week_ago and assessment.agent_result.discrepancies:
            stats.discrepancies_this_week += 1
