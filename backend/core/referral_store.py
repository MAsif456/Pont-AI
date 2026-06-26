"""JSON-file store for referrals, mirroring the case store's pattern.

Uses the same lock-guarded approach as ``CaseStore`` and writes atomically
(temp file + ``os.replace``) so a crash mid-write can never leave a half-written
``referrals.json``.
"""

import json
import os
import tempfile
import threading
import uuid
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from config import get_settings
from models.referral_intake import Referral, ReferralStatus, ScreeningResult

_LOCK = threading.Lock()

# Statuses that still represent live work, used for caseload balancing.
_OPEN_STATUSES = {"assigned", "in_progress", "report_ready"}

# Where a screening outcome moves the referral next.
_OUTCOME_STATUS: dict[str, ReferralStatus] = {
    "information_only": "closed_information_only",
    "redirect": "closed_redirected",
    "proportionate_assessment": "screened",
}


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ReferralStore:
    """Persists referrals and their lifecycle transitions to a JSON file."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path or (get_settings().data_dir / "referrals.json")

    def _load(self) -> list[Referral]:
        if not self._path.exists():
            return []
        with self._path.open(encoding="utf-8") as handle:
            return [Referral.model_validate(record) for record in json.load(handle)]

    def _write(self, referrals: list[Referral]) -> None:
        """Atomically replace the file so a partial write can't corrupt it."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(
            [referral.model_dump() for referral in referrals], indent=2, ensure_ascii=False
        )
        descriptor, temp_path = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                handle.write(payload)
            os.replace(temp_path, self._path)
        except BaseException:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise

    def create(self, referral: Referral) -> Referral:
        with _LOCK:
            referrals = self._load()
            referrals.append(referral)
            self._write(referrals)
        return referral

    def list_all(self) -> list[Referral]:
        return self._load()

    def get(self, referral_id: str) -> Referral | None:
        return next((r for r in self._load() if r.referral_id == referral_id), None)

    def _mutate(self, referral_id: str, apply):
        """Load, find, apply a change, and persist atomically under the lock."""
        with _LOCK:
            referrals = self._load()
            referral = next((r for r in referrals if r.referral_id == referral_id), None)
            if referral is None:
                return None
            apply(referral)
            self._write(referrals)
            return referral

    def apply_screening(self, referral_id: str, result: ScreeningResult) -> Referral | None:
        """Record the screening outcome and move the referral to its next status."""
        def update(referral: Referral) -> None:
            referral.screening_outcome = result.outcome
            referral.screening_notes = result.rationale
            referral.verification_flag = result.verification_flag
            referral.status = _OUTCOME_STATUS[result.outcome]

        return self._mutate(referral_id, update)

    def assign(self, referral_id: str, worker: str) -> Referral | None:
        def update(referral: Referral) -> None:
            referral.assigned_worker = worker
            referral.status = "assigned"

        return self._mutate(referral_id, update)

    def mark_in_progress(self, referral_id: str) -> Referral | None:
        def update(referral: Referral) -> None:
            referral.status = "in_progress"

        return self._mutate(referral_id, update)

    def link_case(self, referral_id: str, case_id: str) -> Referral | None:
        def update(referral: Referral) -> None:
            referral.case_id = case_id
            referral.status = "report_ready"

        return self._mutate(referral_id, update)

    def approve(self, referral_id: str) -> Referral | None:
        return self._mutate(referral_id, lambda referral: setattr(referral, "status", "approved"))

    def open_caseload(self) -> dict[str, int]:
        """Count open (live) referrals per assigned worker, for load balancing."""
        counts: Counter[str] = Counter()
        for referral in self._load():
            if referral.assigned_worker and referral.status in _OPEN_STATUSES:
                counts[referral.assigned_worker] += 1
        return dict(counts)


def build_referral(request, referred_at: str | None = None) -> Referral:
    """Construct a new 'new'-status referral from a create request."""
    return Referral(
        referral_id=_new_id(),
        patient_id=request.patient_id,
        patient_name=request.patient_name,
        source=request.source,
        reason_for_referral=request.reason_for_referral,
        electronic_note=request.electronic_note,
        handover_note=request.handover_note,
        referred_at=referred_at or request.referred_at or now_iso(),
        status="new",
    )
