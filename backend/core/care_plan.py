"""Synthesise a Dynamic Care Plan by reconciling the three domains.

A single, bounded structured LLM call -- not agentic, no tools. It takes the
Social Care Agent's existing output plus the clinical and family domain records
and produces one reconciled plan, flagging conflicts *between* domains. The
recommendations are passed through verbatim; the model only writes the narrative
and the cross-domain reconciliation.
"""

import json
from datetime import UTC, datetime

from core.json_utils import generate_json
from core.llm.base import LLMClient
from models.care_plan import CarePlan, CrossDomainFlag
from models.context import ClinicalContext, FamilyContext
from models.referral import AgentResult

_PROMPT = """TASK: SYNTHESISE_CARE_PLAN
You are an AI orchestration layer producing ONE dynamic care plan for a hospital \
discharge, by reconciling three domains: social care (assessed needs and \
recommended services), clinical (discharge readiness, outstanding tasks, \
medication, recent updates) and family (preferences, consent, transport).

Return JSON ONLY (no prose, no code fences):
{{"discharge_recommendation": string, "summary": string, "clinical_considerations": [string], "family_considerations": [string], "cross_domain_flags": [{{"description": string, "domains": [string]}}]}}

- discharge_recommendation: one clear line (e.g. "Ready for discharge with the support plan below" or "Discharge should be delayed pending a medication review").
- summary: 2-3 sentences reconciling the three domains.
- clinical_considerations / family_considerations: short bullet strings.
- cross_domain_flags: conflicts or gaps BETWEEN domains (e.g. clinical indicates readiness but no care package is in place; family prefers home care but a safety risk is flagged; consent is not on file). Empty array if none.

INPUT:
{payload}"""


def synthesise_care_plan(
    llm: LLMClient,
    agent_result: AgentResult,
    clinical: ClinicalContext | None,
    family: FamilyContext | None,
    patient_name: str,
    version: int,
) -> CarePlan:
    """Produce a reconciled care plan plus a plain-text rendering."""
    narrative = generate_json(llm, _build_prompt(agent_result, clinical, family, patient_name))
    narrative = narrative if isinstance(narrative, dict) else {}
    plan = _assemble(narrative, agent_result, patient_name, version)
    plan.text_version = _render_text(plan)
    return plan


def _build_prompt(
    agent_result: AgentResult,
    clinical: ClinicalContext | None,
    family: FamilyContext | None,
    patient_name: str,
) -> str:
    payload = {
        "patient_name": patient_name,
        "needs_profile": agent_result.needs_profile.model_dump(),
        "discrepancies": [d.model_dump() for d in agent_result.discrepancies],
        "recommendations": [
            {"name": rec.name, "category": rec.category, "confidence": rec.confidence}
            for rec in agent_result.recommendations
        ],
        "clinical": clinical.model_dump() if clinical else None,
        "family": family.model_dump() if family else None,
    }
    return _PROMPT.format(payload=json.dumps(payload))


def _assemble(
    narrative: dict, agent_result: AgentResult, patient_name: str, version: int
) -> CarePlan:
    """Combine model narrative with data the model must not invent."""
    flags = [
        CrossDomainFlag(
            description=str(item.get("description", "")),
            domains=[str(domain) for domain in item.get("domains", [])],
        )
        for item in narrative.get("cross_domain_flags", [])
        if isinstance(item, dict)
    ]
    return CarePlan(
        patient_name=patient_name,
        generated_at=datetime.now(UTC).isoformat(),
        version=version,
        discharge_recommendation=str(narrative.get("discharge_recommendation", "")),
        summary=str(narrative.get("summary", "")),
        recommended_services=agent_result.recommendations,
        clinical_considerations=[str(item) for item in narrative.get("clinical_considerations", [])],
        family_considerations=[str(item) for item in narrative.get("family_considerations", [])],
        cross_domain_flags=flags,
    )


def _render_text(plan: CarePlan) -> str:
    """Render the care plan as clean plain text."""
    lines = [
        f"DYNAMIC CARE PLAN (v{plan.version}) -- {plan.patient_name}",
        "=" * 60,
        "",
        "DISCHARGE RECOMMENDATION",
        plan.discharge_recommendation,
        "",
        "SUMMARY",
        plan.summary,
        "",
    ]
    _append_bullets(lines, "RECOMMENDED SERVICES", [
        f"{rec.rank}. {rec.name} ({rec.category}) -- {rec.confidence} confidence"
        for rec in plan.recommended_services
    ])
    _append_bullets(lines, "CLINICAL CONSIDERATIONS", plan.clinical_considerations)
    _append_bullets(lines, "FAMILY CONSIDERATIONS", plan.family_considerations)
    _append_bullets(lines, "CROSS-DOMAIN FLAGS", [flag.description for flag in plan.cross_domain_flags])
    lines += ["-" * 60, plan.human_review_statement]
    return "\n".join(lines)


def _append_bullets(lines: list[str], heading: str, items: list[str]) -> None:
    if not items:
        return
    lines.append(heading)
    lines += [f"  - {item}" for item in items]
    lines.append("")
