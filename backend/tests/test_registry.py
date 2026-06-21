"""Tests for the MCP-style tool manifest."""

from tools.registry import TOOL_MANIFEST, tool_names


def test_manifest_declares_the_four_tools():
    assert set(tool_names()) == {
        "extract_needs", "search_services", "get_clinical_context", "get_family_context",
    }


def test_each_tool_has_description_and_parameters():
    for tool in TOOL_MANIFEST:
        assert tool["description"]
        assert isinstance(tool["parameters"], dict)
        assert tool["domain"] in {"social_care", "clinical", "family"}
