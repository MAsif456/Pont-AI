"""Tests for defensive JSON parsing and the single stricter retry."""

import pytest

from core.json_utils import LLMJsonError, extract_json, generate_json


def test_extract_plain_json():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_from_code_fence():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_extract_with_preamble_and_trailing_text():
    assert extract_json('Here you go: {"a": [1, 2]} -- done') == {"a": [1, 2]}


def test_extract_invalid_raises():
    with pytest.raises(LLMJsonError):
        extract_json("not json at all")


class _Sequenced:
    """LLM stub returning queued responses, recording prompts received."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.prompts = []

    def generate(self, prompt):
        self.prompts.append(prompt)
        return self._responses.pop(0)


def test_generate_json_retries_once_then_succeeds():
    llm = _Sequenced(["garbage", '{"ok": true}'])
    assert generate_json(llm, "do it") == {"ok": True}
    # The retry prompt must differ from (and extend) the original.
    assert len(llm.prompts) == 2
    assert llm.prompts[1].startswith("do it")
    assert len(llm.prompts[1]) > len(llm.prompts[0])


def test_generate_json_raises_after_failed_retry():
    llm = _Sequenced(["garbage", "still garbage"])
    with pytest.raises(LLMJsonError):
        generate_json(llm, "do it")
