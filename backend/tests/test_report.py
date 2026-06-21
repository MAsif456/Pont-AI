"""Tests for referral report generation."""

from core.report_generator import generate_report
from models.context import ClinicalContext, FamilyContext
from models.needs import Discrepancy, NeedsProfile
from models.referral import AgentResult, Recommendation
from models.report import HUMAN_REVIEW_STATEMENT


def _agent_result() -> AgentResult:
    return AgentResult(
        patient_id="PT-001",
        needs_profile=NeedsProfile(
            dementia_stage="moderate", living_situation="lives alone",
            mobility_needs="uses walking aid", carer_status="no carer present",
            key_risks=["falls risk", "social isolation"], summary="Moderate dementia, lives alone.",
        ),
        discrepancies=[
            Discrepancy(sources=["Family", "Ward"], description="Disagree on personal care.")
        ],
        clinical_context=ClinicalContext(patient_id="PT-001", discharge_readiness_score="Ready"),
        family_context=FamilyContext(patient_id="PT-001", consent_on_file=True),
        recommendations=[
            Recommendation(
                service_id="SVC-001", name="Home Care", category="home care", rank=1,
                justification="Fits well.", confidence="high",
            )
        ],
    )


def test_report_includes_structured_fields_and_human_review(mock_llm):
    report = generate_report(mock_llm, _agent_result(), patient_name="Gwendoline Pritchard")
    assert report.patient_summary
    assert report.identified_needs
    assert report.recommended_services
    assert report.discrepancies  # carried through from the agent result
    assert report.human_review_statement == HUMAN_REVIEW_STATEMENT


def test_report_text_version_is_rendered(mock_llm):
    report = generate_report(mock_llm, _agent_result(), patient_name="Gwendoline Pritchard")
    text = report.text_version
    assert "REFERRAL REPORT" in text
    assert "RECOMMENDED SERVICES" in text
    assert HUMAN_REVIEW_STATEMENT in text


def test_report_references_clinical_and_family_context(mock_llm):
    report = generate_report(mock_llm, _agent_result())
    assert report.clinical_context_referenced
    assert report.family_context_referenced
