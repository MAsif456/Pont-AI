"""Tools: get_clinical_context / get_family_context.

These represent querying the Clinical Agent and Family Agent in the full
multi-agent architecture. In this phase they are simple, deterministic lookups
of lightweight synthetic records -- no LLM reasoning is performed for clinical or
family context, by design.

MCP manifest entries:
    name: get_clinical_context
    description: Return the Clinical domain's record for a patient (diagnosis,
                 medication, discharge readiness, outstanding clinical tasks).
    parameters: patient_id (string, required)

    name: get_family_context
    description: Return the Family domain's record for a patient (preferences,
                 consent status, transport).
    parameters: patient_id (string, required)
"""

from functools import lru_cache

from core.data_loader import load_clinical_context, load_family_context
from models.context import ClinicalContext, FamilyContext


@lru_cache(maxsize=1)
def _clinical_records() -> dict[str, dict]:
    # Cached so the JSON file is read once per process rather than per lookup.
    return load_clinical_context()


@lru_cache(maxsize=1)
def _family_records() -> dict[str, dict]:
    return load_family_context()


def get_clinical_context(patient_id: str) -> ClinicalContext | None:
    """Return the clinical record for ``patient_id``, or None if unknown."""
    record = _clinical_records().get(patient_id)
    return ClinicalContext.model_validate(record) if record else None


def get_family_context(patient_id: str) -> FamilyContext | None:
    """Return the family record for ``patient_id``, or None if unknown."""
    record = _family_records().get(patient_id)
    return FamilyContext.model_validate(record) if record else None
