"""Loads the bundled synthetic datasets from disk.

Centralising file access here means paths and JSON parsing live in one place,
and callers work with typed :class:`Service` objects rather than raw dicts.
"""

import json
from pathlib import Path

from config import get_settings
from models.service import Service


def _read_json(path: Path) -> list[dict]:
    """Read a JSON array file, raising a clear error if it is missing."""
    if not path.exists():
        raise FileNotFoundError(f"Expected data file not found: {path}")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_services() -> list[Service]:
    """Load and validate the Cardiff service directory."""
    records = _read_json(get_settings().data_dir / "services.json")
    return [Service.model_validate(record) for record in records]


def load_patients() -> list[dict]:
    """Load the synthetic social-care patient records as raw dicts.

    Patients are returned as dicts rather than a model because they are only used
    by scripts and tests as pipeline inputs, not as a persisted domain type.
    """
    return _read_json(get_settings().data_dir / "social_care_patients.json")


def _index_by_patient_id(records: list[dict]) -> dict[str, dict]:
    """Key a list of context records by ``patient_id`` for direct lookup."""
    return {record["patient_id"]: record for record in records}


def load_clinical_context() -> dict[str, dict]:
    """Load lightweight Clinical-domain records, keyed by patient id.

    Represents what the Clinical Agent would expose; in this phase it is a static
    lookup, not an autonomous agent.
    """
    records = _read_json(get_settings().data_dir / "clinical_context.json")
    return _index_by_patient_id(records)


def load_family_context() -> dict[str, dict]:
    """Load lightweight Family-domain records, keyed by patient id.

    Represents what the Family Agent would expose; static lookup only in this phase.
    """
    records = _read_json(get_settings().data_dir / "family_context.json")
    return _index_by_patient_id(records)
