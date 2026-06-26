"""Dispatcher for the mock language model.

Reads the ``TASK:`` marker and ``INPUT:`` JSON block that every prompt carries,
routes to the matching heuristic handler, and returns its result as a JSON string
-- mirroring the shape a live model would return.
"""

import json
import re

from .agent import handle_plan, handle_rank
from .extract import handle_extract
from .report import handle_report
from .screening import handle_screen

_TASK_PATTERN = re.compile(r"TASK:\s*([A-Z_]+)")
_INPUT_MARKER = "INPUT:"

# Maps the task marker to its handler. Adding a pipeline step means adding one
# entry here and one prompt builder -- the dispatcher itself never changes.
_HANDLERS = {
    "EXTRACT_NEEDS": handle_extract,
    "AGENT_PLAN": handle_plan,
    "RANK_REFERRALS": handle_rank,
    "GENERATE_REPORT": handle_report,
    "SCREEN_REFERRAL": handle_screen,
}


class MockLLMClient:
    """Offline, deterministic stand-in for the live Gemini client."""

    def generate(self, prompt: str) -> str:
        task, payload = self._parse(prompt)
        handler = _HANDLERS.get(task)
        if handler is None:
            raise ValueError(f"Mock model received an unknown task: {task!r}")
        return json.dumps(handler(payload))

    @staticmethod
    def _parse(prompt: str) -> tuple[str, dict]:
        """Extract the task name and JSON payload embedded in the prompt."""
        match = _TASK_PATTERN.search(prompt)
        if not match:
            raise ValueError("Mock model prompt is missing a 'TASK:' marker.")
        marker_index = prompt.find(_INPUT_MARKER)
        if marker_index == -1:
            return match.group(1), {}
        raw_payload = prompt[marker_index + len(_INPUT_MARKER):].strip()
        return match.group(1), json.loads(raw_payload) if raw_payload else {}
