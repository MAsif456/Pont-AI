"""Helpers for coaxing valid JSON out of a language model.

Models occasionally wrap JSON in code fences or add a sentence of preamble even
when asked not to. These helpers parse defensively and, on failure, retry once
with a stricter instruction -- the single retry required by the spec, implemented
once and reused by every pipeline step.
"""

import json
import re

from .llm.base import LLMClient

# Matches a ```json ... ``` or ``` ... ``` fenced block.
_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)

_STRICTER_SUFFIX = (
    "\n\nIMPORTANT: Your previous response could not be parsed. "
    "Respond with a single valid JSON value only -- no markdown, no code fences, "
    "no commentary before or after."
)


class LLMJsonError(ValueError):
    """Raised when a model response cannot be parsed as JSON after a retry."""


def extract_json(text: str) -> dict | list:
    """Parse the first JSON value found in ``text``.

    Tries the raw text, then a fenced block, then the outermost brace/bracket
    span, so minor formatting noise from the model does not break the pipeline.
    """
    for candidate in _json_candidates(text):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    raise LLMJsonError("No valid JSON found in model response.")


def _json_candidates(text: str) -> list[str]:
    """Yield progressively more aggressive attempts to isolate JSON from text."""
    stripped = text.strip()
    candidates = [stripped]
    fenced = _FENCE_PATTERN.search(text)
    if fenced:
        candidates.append(fenced.group(1).strip())
    span = _outermost_span(stripped)
    if span:
        candidates.append(span)
    return candidates


def _outermost_span(text: str) -> str | None:
    """Return the substring from the first opening to the last closing bracket."""
    starts = [i for i in (text.find("{"), text.find("[")) if i != -1]
    ends = [i for i in (text.rfind("}"), text.rfind("]")) if i != -1]
    if not starts or not ends:
        return None
    start, end = min(starts), max(ends)
    return text[start : end + 1] if end > start else None


def generate_json(llm: LLMClient, prompt: str) -> dict | list:
    """Call the model and parse its JSON, retrying once with a stricter prompt."""
    try:
        return extract_json(llm.generate(prompt))
    except LLMJsonError:
        # One stricter retry, per the spec, before giving up.
        return extract_json(llm.generate(prompt + _STRICTER_SUFFIX))
