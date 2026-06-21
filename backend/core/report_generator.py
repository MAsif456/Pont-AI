"""Generates a referral report from the agent's output.

This is a fixed, deterministic pipeline step (not agentic): it asks the model for
the report's narrative fields, then assembles the structured report and a clean
plain-text rendering in Python so the human-review statement and recommendations
are always present and consistent.
"""

import json

from core.json_utils import generate_json
from core.llm.base import LLMClient
from models.referral import AgentResult, Recommendation
from models.report import ReferralReport

_PROMPT_TEMPLATE = """TASK: GENERATE_REPORT
You are drafting a dementia referral report for a care coordinator to review. Use \
the needs profile, any discrepancies, the recommendations, and the clinical and \
family context.

Return JSON ONLY (no prose, no code fences):
{{"patient_summary": string, "identified_needs": [string], "flagged_risks": [string], "clinical_context_referenced": string, "family_context_referenced": string}}

- patient_summary: 2-3 sentences.
- identified_needs and flagged_risks: short strings.
- clinical_context_referenced / family_context_referenced: 1-2 sentences each, or "" if no context was provided.

INPUT:
{payload}"""


def generate_report(
    llm: LLMClient, agent_result: AgentResult, patient_name: str | None = None
) -> ReferralReport:
    """Produce a structured referral report plus a plain-text rendering."""
    narrative = generate_json(llm, _build_prompt(agent_result, patient_name))
    narrative = narrative if isinstance(narrative, dict) else {}
    report = _assemble(narrative, agent_result)
    report.text_version = _render_text(report)
    return report


def _build_prompt(agent_result: AgentResult, patient_name: str | None) -> str:
    payload = {
        "patient_name": patient_name,
        "patient_id": agent_result.patient_id,
        "needs_profile": agent_result.needs_profile.model_dump(),
        "discrepancies": [d.model_dump() for d in agent_result.discrepancies],
        "recommendations": [r.model_dump() for r in agent_result.recommendations],
        "clinical_context": agent_result.clinical_context.model_dump()
        if agent_result.clinical_context
        else None,
        "family_context": agent_result.family_context.model_dump()
        if agent_result.family_context
        else None,
    }
    return _PROMPT_TEMPLATE.format(payload=json.dumps(payload))


def _assemble(narrative: dict, agent_result: AgentResult) -> ReferralReport:
    """Combine model narrative with structured data the model must not invent."""
    return ReferralReport(
        patient_summary=str(narrative.get("patient_summary", "")),
        identified_needs=[str(need) for need in narrative.get("identified_needs", [])],
        discrepancies=agent_result.discrepancies,
        recommended_services=agent_result.recommendations,
        flagged_risks=[str(risk) for risk in narrative.get("flagged_risks", [])],
        clinical_context_referenced=str(narrative.get("clinical_context_referenced", "")),
        family_context_referenced=str(narrative.get("family_context_referenced", "")),
    )


def _render_text(report: ReferralReport) -> str:
    """Render the report as clean plain text for display or future PDF export."""
    lines = ["REFERRAL REPORT", "=" * 60, "", "PATIENT SUMMARY", report.patient_summary, ""]
    _append_bullets(lines, "IDENTIFIED NEEDS", report.identified_needs)
    _append_bullets(lines, "FLAGGED RISKS", report.flagged_risks)
    _append_discrepancies(lines, report)
    _append_recommendations(lines, report.recommended_services)
    _append_context(lines, report)
    lines += ["", "-" * 60, report.human_review_statement]
    return "\n".join(lines)


def _append_bullets(lines: list[str], heading: str, items: list[str]) -> None:
    if not items:
        return
    lines.append(heading)
    lines += [f"  - {item}" for item in items]
    lines.append("")


def _append_discrepancies(lines: list[str], report: ReferralReport) -> None:
    if not report.discrepancies:
        return
    lines.append("SOURCE DISCREPANCIES (review needed)")
    lines += [f"  - {d.description}" for d in report.discrepancies]
    lines.append("")


def _append_recommendations(lines: list[str], recommendations: list[Recommendation]) -> None:
    if not recommendations:
        lines += ["RECOMMENDED SERVICES", "  - None identified.", ""]
        return
    lines.append("RECOMMENDED SERVICES")
    for rec in recommendations:
        flag = " [RECOMMENDED FOR HUMAN REVIEW]" if rec.recommended_for_human_review else ""
        lines.append(f"  {rec.rank}. {rec.name} ({rec.category}) -- {rec.confidence} confidence{flag}")
        lines.append(f"     {rec.justification}")
    lines.append("")


def _append_context(lines: list[str], report: ReferralReport) -> None:
    if report.clinical_context_referenced:
        lines += ["CLINICAL CONTEXT REFERENCED", f"  {report.clinical_context_referenced}", ""]
    if report.family_context_referenced:
        lines += ["FAMILY CONTEXT REFERENCED", f"  {report.family_context_referenced}", ""]
