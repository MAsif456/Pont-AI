"""Populate the case store with a deliberately composed set of demo cases.

The goal is a dashboard that tells a believable story, not just volume:
- a healthy spread of statuses (pending / approved / sent back for changes),
- several cases with discrepancies visible in the list,
- assessment dates spread across the last few weeks, and
- one patient (Eira Bowen) re-assessed a month later after deteriorating, so the
  patient-history / "dynamic care plan" view has a real timeline to show.

Safe to re-run: it clears existing cases first.

    python scripts/seed_cases.py
"""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.social_care_agent import SocialCareAgent  # noqa: E402
from config import get_settings  # noqa: E402
from core.case_store import CaseStore  # noqa: E402
from core.data_loader import load_patients  # noqa: E402
from core.llm.factory import build_llm_client  # noqa: E402
from core.report_generator import generate_report  # noqa: E402
from core.vector_store import VectorStore  # noqa: E402
from models.api import RunAgentRequest  # noqa: E402
from models.case import CaseStatus  # noqa: E402
from models.patient import PatientIntake, SourceNoteInput  # noqa: E402

# (patient_id, days_ago, status) -- chosen for a realistic mix. PT-001/003/011
# carry deliberate source-note discrepancies, so they surface flags in the list.
_SEED_PLAN: list[tuple[str, int, CaseStatus]] = [
    ("PT-001", 2, "pending_review"),     # discrepancy, just in, awaiting review
    ("PT-011", 4, "changes_requested"),  # discrepancy, sent back for more info
    ("PT-003", 9, "approved"),           # discrepancy reviewed, now approved
    ("PT-007", 15, "pending_review"),    # safeguarding crisis, awaiting review
    ("PT-009", 23, "approved"),          # straightforward, approved a few weeks ago
]


def _iso_days_ago(days: int) -> str:
    return (datetime.now(UTC) - timedelta(days=days)).isoformat()


def _store_run(agent, llm, case_store, request, patient_id, name, days_ago, status):
    """Run the pipeline and persist it as a backdated, pre-statused assessment."""
    result = agent.run(request)
    report = generate_report(llm, result, patient_name=name)
    case_store.add_assessment(
        patient_id, name, result, report,
        created_at=_iso_days_ago(days_ago), status=status,
    )


def _deterioration_followup() -> RunAgentRequest:
    """A raw intake describing Eira (PT-005) deteriorated since her last review."""
    return RunAgentRequest(
        patient_data=PatientIntake(
            diagnosis_stage="severe", living_situation="lives alone",
            mobility="uses walking aid", carer_present=False,
            cognitive_notes="Rapid decline, left the gas on twice, several falls, not eating.",
        ),
        source_notes=[
            SourceNoteInput(
                source="Social Worker Assessment",
                text=(
                    "Significant deterioration since the last review. Now severe, unsafe "
                    "at home with falls, self-neglect and a safeguarding concern."
                ),
            )
        ],
        patient_name="Eira Bowen",
    )


def _seed_eira(agent, llm, case_store, name) -> None:
    """Two assessments a month apart: an approved plan, then a pending escalation."""
    _store_run(
        agent, llm, case_store, RunAgentRequest(patient_id="PT-005"),
        "PT-005", name, days_ago=34, status="approved",
    )
    _store_run(
        agent, llm, case_store, _deterioration_followup(),
        "PT-005", name, days_ago=3, status="pending_review",
    )


def main() -> None:
    settings = get_settings()
    llm = build_llm_client(settings)
    agent = SocialCareAgent(llm, VectorStore(settings))
    cases_path = settings.data_dir / "cases.json"
    cases_path.unlink(missing_ok=True)  # start clean
    case_store = CaseStore(cases_path)
    names = {patient["patient_id"]: patient["name"] for patient in load_patients()}

    for patient_id, days_ago, status in _SEED_PLAN:
        request = RunAgentRequest(patient_id=patient_id)
        _store_run(agent, llm, case_store, request, patient_id, names[patient_id], days_ago, status)

    _seed_eira(agent, llm, case_store, names["PT-005"])

    print(f"Seeded {len(case_store.list_summaries())} cases (mode={settings.llm_mode}).")


if __name__ == "__main__":
    main()
