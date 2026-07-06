"""Append-only store for staff interactions, plus per-actor summary aggregation.

The summary quantifies the whole workflow: it counts directly-logged interactions
alongside the intake source notes and clinical updates already captured, all
normalised onto canonical actor roles.
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
from core.clinical_update_store import ClinicalUpdateStore
from core.data_loader import load_patients
from models.interaction import ActorCount, InteractionSummary, StaffInteraction

_LOCK = threading.Lock()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def normalise_role(raw: str) -> str:
    """Map a raw source label onto a canonical actor role for grouping."""
    role = (raw or "").strip().lower()
    if not role:
        return "Other"
    if "discharge" in role:
        return "Discharge Liaison"
    if role == "ot" or "occupational" in role:
        return "OT"
    if "consultant" in role:
        return "Consultant"
    if role == "gp" or "general practitioner" in role:
        return "GP"
    if "ward" in role or "nurse" in role or "nursing" in role:
        return "Ward Nurse"
    if "social" in role:
        return "Social Worker"
    if "family" in role or "carer" in role or role.startswith("self"):
        return "Family/Carer"
    return raw.strip()


class InteractionStore:
    """Persists directly-logged staff interactions to a JSON file."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path or (get_settings().data_dir / "interactions.json")

    def _load(self) -> list[StaffInteraction]:
        if not self._path.exists():
            return []
        with self._path.open(encoding="utf-8") as handle:
            return [StaffInteraction.model_validate(item) for item in json.load(handle)]

    def _write(self, interactions: list[StaffInteraction]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(
            [item.model_dump() for item in interactions], indent=2, ensure_ascii=False
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

    def add(self, patient_id: str, actor_role: str, note: str) -> StaffInteraction:
        interaction = StaffInteraction(
            interaction_id=uuid.uuid4().hex[:12], patient_id=patient_id,
            actor_role=normalise_role(actor_role), note=note, timestamp=_now_iso(),
            channel="logged",
        )
        with _LOCK:
            interactions = self._load()
            interactions.append(interaction)
            self._write(interactions)
        return interaction

    def list_for(self, patient_id: str) -> list[StaffInteraction]:
        return [item for item in self._load() if item.patient_id == patient_id]


def build_summary(
    patient_id: str, store: InteractionStore, clinical_store: ClinicalUpdateStore
) -> InteractionSummary:
    """Merge logged interactions with source notes and clinical updates into counts."""
    interactions = (
        store.list_for(patient_id)
        + _from_source_notes(patient_id)
        + _from_clinical_updates(patient_id, clinical_store)
    )
    counts = Counter(item.actor_role for item in interactions)
    by_actor = [
        ActorCount(role=role, count=count)
        for role, count in sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    ]
    timeline = sorted(interactions, key=lambda item: item.timestamp, reverse=True)
    return InteractionSummary(
        patient_id=patient_id, total=len(interactions), by_actor=by_actor, interactions=timeline,
    )


def _from_source_notes(patient_id: str) -> list[StaffInteraction]:
    """Treat each intake source note as one interaction by its (normalised) actor."""
    record = next((p for p in load_patients() if p.get("patient_id") == patient_id), None)
    if not record:
        return []
    timestamp = record.get("assessment_date", "")
    return [
        StaffInteraction(
            interaction_id=f"{patient_id}-src-{index}", patient_id=patient_id,
            actor_role=normalise_role(note.get("source", "")),
            note=note.get("note", ""), timestamp=timestamp, channel="intake note",
        )
        for index, note in enumerate(record.get("source_notes", []))
    ]


def _from_clinical_updates(
    patient_id: str, clinical_store: ClinicalUpdateStore
) -> list[StaffInteraction]:
    """Treat each clinical update as one interaction by its (normalised) actor."""
    context = clinical_store.get_context(patient_id)
    if context is None:
        return []
    return [
        StaffInteraction(
            interaction_id=update.update_id, patient_id=patient_id,
            actor_role=normalise_role(update.source),
            note=f"{update.field_changed}: {update.new_value}",
            timestamp=update.timestamp, channel="clinical update",
        )
        for update in context.clinical_updates
    ]
