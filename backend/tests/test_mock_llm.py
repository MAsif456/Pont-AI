"""Tests for the mock model dispatcher's parsing and error handling."""

import json

import pytest

from core.llm.mock import MockLLMClient


def test_unknown_task_raises():
    with pytest.raises(ValueError, match="unknown task"):
        MockLLMClient().generate("TASK: SOMETHING_ELSE\nINPUT:\n{}")


def test_missing_task_marker_raises():
    with pytest.raises(ValueError, match="TASK:"):
        MockLLMClient().generate("no marker here")


def test_extract_task_returns_expected_keys():
    prompt = "TASK: EXTRACT_NEEDS\nINPUT:\n" + json.dumps(
        {"sources": [], "structured": {"diagnosis_stage": "mild"}, "raw_text": ""}
    )
    result = json.loads(MockLLMClient().generate(prompt))
    assert result["dementia_stage"] == "mild"
    assert set(result) >= {"mobility_needs", "key_risks", "summary", "discrepancies"}
