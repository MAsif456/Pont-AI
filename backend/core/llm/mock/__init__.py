"""Deterministic offline language model used when PONT_LLM_MODE is not 'live'.

The mock parses a ``TASK:`` marker and an ``INPUT:`` JSON block from each prompt
(the same prompts the live model receives) and returns schema-valid JSON via
keyword heuristics. This keeps the whole pipeline -- and the test suite --
runnable with no API key, while live mode uses genuine Gemini reasoning.
"""

from .client import MockLLMClient

__all__ = ["MockLLMClient"]
