"""Prompt builders for the Social Care Agent's planning and ranking calls.

Each prompt carries a ``TASK:`` marker and an ``INPUT:`` JSON block: the live
model reads the natural-language instructions, while the offline mock reads the
same marker and payload. Keeping both in one template guarantees they stay in step.
"""

import json
from typing import Any

_PLAN_TEMPLATE = """TASK: AGENT_PLAN
You are the Social Care Agent coordinating a dementia referral in Cardiff. Decide \
the next step. You may search the Cardiff service directory by category, choosing \
categories ONLY from available_categories. Review what you have already retrieved \
(history) before deciding.

Return JSON ONLY (no prose, no code fences):
{{"reasoning": string, "action": "search" or "finalise", "searches": [{{"category": string, "query": string}}]}}

Rules:
- Issue targeted searches for the categories most relevant to the needs profile and any discrepancies.
- Do not repeat a category already present in history.
- You have a limited tool-call budget (remaining_tool_calls); when it reaches 0 you MUST finalise.
- Do not search unnecessarily: finalise once you have relevant options for a simple case.

INPUT:
{payload}"""

_RANK_TEMPLATE = """TASK: RANK_REFERRALS
You are ranking retrieved Cardiff services as referral recommendations for one \
dementia patient. Weigh the needs profile, any discrepancies, and the clinical \
and family context provided.

Return JSON ONLY (no prose, no code fences):
{{"recommendations": [{{"service_id": string, "name": string, "category": string, "rank": integer, "justification": string, "confidence": "high"|"medium"|"low", "recommended_for_human_review": boolean}}]}}

Rules:
- Rank best first (rank 1 is the strongest match). Include at most 5.
- justification: 2-3 sentences on why this service fits THIS patient.
- Set recommended_for_human_review to true whenever confidence is "low".

INPUT:
{payload}"""


def build_plan_prompt(payload: dict[str, Any]) -> str:
    """Render the planning prompt around its JSON payload."""
    return _PLAN_TEMPLATE.format(payload=json.dumps(payload))


def build_rank_prompt(payload: dict[str, Any]) -> str:
    """Render the ranking prompt around its JSON payload."""
    return _RANK_TEMPLATE.format(payload=json.dumps(payload))
