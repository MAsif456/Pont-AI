"""The Social Care Agent: a bounded agentic loop over the MCP-style tools.

The agent extracts a needs profile, queries the Clinical and Family domains for
context, then reasons about which service categories to search, issuing retrieval
queries and optionally following up before finalising ranked recommendations.

Every tool call is counted against a single hard budget (``MAX_TOOL_CALLS``) and
logged to a reasoning trail. The budget covers *all* tool invocations -- needs
extraction, both context lookups, and every service search -- so the loop is
guaranteed to terminate and to finalise best-effort if the cap is reached.
"""

from core.data_loader import load_services
from core.json_utils import generate_json
from core.llm.base import LLMClient
from core.vector_store import VectorStore
from models.needs import NeedsResult
from models.referral import AgentResult, ReasoningStep
from models.service import RetrievedService
from tools.context_lookup import get_clinical_context, get_family_context
from tools.extract_needs import extract_needs
from tools.registry import TOOL_MANIFEST
from tools.search_services import search_services

from .intake import ResolvedInput, resolve_input
from .prompts import build_plan_prompt
from .ranking import rank_candidates

MAX_TOOL_CALLS = 5

# Maps each tool to its domain/MCP server so the reasoning trail can be grouped
# by domain in the coordination view. Built from the single source of truth.
_TOOL_DOMAIN = {tool["name"]: tool["domain"] for tool in TOOL_MANIFEST}


class _ToolCounter:
    """Tracks tool-call spend against the hard budget."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        self.used = 0

    @property
    def remaining(self) -> int:
        return self.limit - self.used

    def spend(self) -> None:
        self.used += 1


class SocialCareAgent:
    """Runs the bounded reasoning loop for one referral."""

    def __init__(self, llm: LLMClient, store: VectorStore) -> None:
        self._llm = llm
        self._store = store
        # Constrain the planner to categories that actually exist in the store.
        self._available_categories = sorted({svc.category for svc in load_services()})

    def run(self, request) -> AgentResult:
        resolved = resolve_input(request)
        trail: list[ReasoningStep] = []
        counter = _ToolCounter(MAX_TOOL_CALLS)

        needs = self._extract(resolved, trail, counter)
        clinical, family = self._gather_context(resolved, trail, counter)
        candidates = self._retrieval_loop(needs, trail, counter)
        recommendations = rank_candidates(
            self._llm, needs.profile, needs.discrepancies, candidates, clinical, family
        )

        return AgentResult(
            patient_id=resolved.patient_id,
            needs_profile=needs.profile,
            discrepancies=needs.discrepancies,
            clinical_context=clinical,
            family_context=family,
            recommendations=recommendations,
            reasoning_trail=trail,
            tool_calls_used=counter.used,
        )

    def _extract(self, resolved: ResolvedInput, trail: list, counter: _ToolCounter) -> NeedsResult:
        needs = extract_needs(
            self._llm, resolved.patient_data, resolved.raw_text, resolved.source_notes
        )
        counter.spend()
        _log(
            trail, counter, "extract_needs",
            f"{len(resolved.source_notes)} source note(s)",
            f"Profile built; {len(needs.discrepancies)} discrepancy(ies) flagged.",
            "Extracted a structured needs profile and checked sources for conflict.",
        )
        return needs

    def _gather_context(self, resolved: ResolvedInput, trail: list, counter: _ToolCounter):
        """Query the Clinical and Family domains (represents the other two agents)."""
        if not resolved.has_patient_record:
            return None, None
        clinical = family = None
        if counter.remaining > 0:
            clinical = get_clinical_context(resolved.patient_id)
            counter.spend()
            _log(
                trail, counter, "get_clinical_context", resolved.patient_id or "",
                _clinical_summary(clinical),
                "Queried the Clinical domain to factor discharge readiness into planning.",
            )
        if counter.remaining > 0:
            family = get_family_context(resolved.patient_id)
            counter.spend()
            _log(
                trail, counter, "get_family_context", resolved.patient_id or "",
                _family_summary(family),
                "Queried the Family domain for care preferences and consent.",
            )
        return clinical, family

    def _retrieval_loop(
        self, needs: NeedsResult, trail: list, counter: _ToolCounter
    ) -> list[RetrievedService]:
        """Plan, search, review and optionally search again within the budget."""
        candidates: dict[str, RetrievedService] = {}
        history: list[dict] = []
        while counter.remaining > 0:
            plan = self._plan(needs, history, counter)
            if plan.get("action") != "search" or not plan.get("searches"):
                _log(trail, counter, "decision", "", "No further searches required.",
                     plan.get("reasoning", "Finalising recommendations."))
                break
            if not self._execute_searches(plan, candidates, history, trail, counter):
                break
        return _sorted_candidates(candidates)

    def _plan(self, needs: NeedsResult, history: list, counter: _ToolCounter) -> dict:
        payload = {
            "needs_profile": needs.profile.model_dump(),
            "discrepancies": [d.model_dump() for d in needs.discrepancies],
            "history": history,
            "remaining_tool_calls": counter.remaining,
            "available_categories": self._available_categories,
        }
        result = generate_json(self._llm, build_plan_prompt(payload))
        if isinstance(result, dict):
            return result
        return {"action": "finalise", "searches": [], "reasoning": "Planning failed; finalising."}

    def _execute_searches(self, plan, candidates, history, trail, counter) -> bool:
        """Run each planned search, merge results, and log the step."""
        executed = False
        for search in plan.get("searches", []):
            if counter.remaining <= 0:
                break
            category = search.get("category")
            query = search.get("query") or category or ""
            hits = search_services(self._store, query, category=category)
            counter.spend()
            executed = True
            for hit in hits:
                _merge_candidate(candidates, hit)
            names = [hit.service.name for hit in hits]
            history.append({"category": category, "query": query, "results": names})
            _log(
                trail, counter, "search_services", f"category={category!r}",
                f"Retrieved {len(hits)}: {', '.join(names) or 'none'}",
                plan.get("reasoning", ""),
            )
        return executed


def _log(
    trail: list, counter: _ToolCounter, tool: str, tool_input: str, summary: str, reasoning: str
) -> None:
    """Append one reasoning-trail step (step number tracks tool spend)."""
    # A "decision" step is the agent's own planning/finalise reasoning that feeds
    # orchestration; every other step maps to the domain that owns the tool.
    domain = "orchestration" if tool == "decision" else _TOOL_DOMAIN.get(tool, "social_care")
    trail.append(
        ReasoningStep(
            step=counter.used, tool=tool, tool_input=tool_input,
            summary=summary, reasoning=reasoning, domain=domain,
        )
    )


def _merge_candidate(candidates: dict, hit: RetrievedService) -> None:
    """Keep the closest distance when the same service is retrieved twice."""
    existing = candidates.get(hit.service.service_id)
    if existing is None or hit.distance < existing.distance:
        candidates[hit.service.service_id] = hit


def _sorted_candidates(candidates: dict) -> list[RetrievedService]:
    return sorted(candidates.values(), key=lambda hit: hit.distance)


def _clinical_summary(clinical) -> str:
    if not clinical:
        return "No clinical record found."
    return f"Discharge readiness: {clinical.discharge_readiness_score or 'unknown'}."


def _family_summary(family) -> str:
    if not family:
        return "No family record found."
    consent = "yes" if family.consent_on_file else "no"
    return f"Preferences noted; consent on file: {consent}."


def build_social_care_agent(llm: LLMClient, store: VectorStore) -> SocialCareAgent:
    """Factory kept alongside the agent for routers to construct it cleanly."""
    return SocialCareAgent(llm, store)
