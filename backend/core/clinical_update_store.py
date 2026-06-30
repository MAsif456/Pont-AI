"""Append-only store for incoming clinical updates.

Updates are appended into ``clinical_context.json`` -- the same file the existing
``get_clinical_context`` tool reads -- so a re-run of the unchanged Social Care
Agent genuinely sees the new context. Writes are atomic (temp file + replace) and
lock-guarded, and the baseline snapshot fields are never overwritten.
"""

import json
import os
import tempfile
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path

from config import get_settings
from models.context import ClinicalContext, ClinicalUpdate

_LOCK = threading.Lock()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _as_dt(iso: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(iso)
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


class ClinicalUpdateStore:
    """Reads and appends clinical updates within ``clinical_context.json``."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path or (get_settings().data_dir / "clinical_context.json")

    def _load_raw(self) -> list[dict]:
        with self._path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def _write(self, records: list[dict]) -> None:
        payload = json.dumps(records, indent=2, ensure_ascii=False)
        descriptor, temp_path = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                handle.write(payload)
            os.replace(temp_path, self._path)
        except BaseException:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise

    def get_context(self, patient_id: str) -> ClinicalContext | None:
        record = next((r for r in self._load_raw() if r["patient_id"] == patient_id), None)
        return ClinicalContext.model_validate(record) if record else None

    def add_update(
        self,
        patient_id: str,
        field_changed: str,
        new_value: str,
        previous_value: str,
        source: str,
        timestamp: str | None = None,
    ) -> ClinicalContext | None:
        """Append one update to a patient's record without overwriting the snapshot."""
        update = ClinicalUpdate(
            update_id=uuid.uuid4().hex[:12],
            timestamp=timestamp or _now_iso(),
            field_changed=field_changed,
            previous_value=previous_value,
            new_value=new_value,
            source=source,
        )
        with _LOCK:
            records = self._load_raw()
            record = next((r for r in records if r["patient_id"] == patient_id), None)
            if record is None:
                return None
            record.setdefault("clinical_updates", []).append(update.model_dump())
            self._write(records)
            return ClinicalContext.model_validate(record)

    def updates_since(self, patient_id: str, since: str | None) -> list[ClinicalUpdate]:
        """Return updates newer than ``since`` (all of them when ``since`` is None)."""
        context = self.get_context(patient_id)
        if context is None:
            return []
        if since is None:
            return context.clinical_updates
        boundary = _as_dt(since)
        return [
            update
            for update in context.clinical_updates
            if boundary is None or (_as_dt(update.timestamp) or boundary) > boundary
        ]
