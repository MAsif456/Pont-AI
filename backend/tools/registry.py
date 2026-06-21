"""MCP-style manifest of the Social Care Agent's tools.

This declares each tool the way an MCP server's tool manifest would (name,
description, typed parameters). In this phase the agent calls the Python
functions directly, but keeping a single declarative manifest means exposing
these over a real MCP server later is a mechanical change, not a redesign.
"""

from typing import Any

# Domain each tool belongs to in the target multi-agent architecture. The Social
# Care Agent owns its own tools and *queries* the Clinical and Family domains.
TOOL_MANIFEST: list[dict[str, Any]] = [
    {
        "name": "extract_needs",
        "domain": "social_care",
        "description": (
            "Extract a structured dementia needs profile from form data, free "
            "text and source notes, flagging disagreements between sources."
        ),
        "parameters": {
            "patient_data": {"type": "object", "required": False},
            "raw_text": {"type": "string", "required": False},
            "source_notes": {"type": "array", "required": False},
        },
    },
    {
        "name": "search_services",
        "domain": "social_care",
        "description": (
            "Search the Cardiff service directory for services matching a "
            "free-text query, optionally narrowed by category and postcode area."
        ),
        "parameters": {
            "query": {"type": "string", "required": True},
            "category": {"type": "string", "required": False},
            "postcode_area": {"type": "string", "required": False},
        },
    },
    {
        "name": "get_clinical_context",
        "domain": "clinical",
        "description": (
            "Return the Clinical domain's record for a patient (diagnosis, "
            "medication, discharge readiness, outstanding clinical tasks)."
        ),
        "parameters": {"patient_id": {"type": "string", "required": True}},
    },
    {
        "name": "get_family_context",
        "domain": "family",
        "description": (
            "Return the Family domain's record for a patient (preferences, "
            "consent status, transport)."
        ),
        "parameters": {"patient_id": {"type": "string", "required": True}},
    },
]


def tool_names() -> list[str]:
    """Convenience accessor for the declared tool names."""
    return [tool["name"] for tool in TOOL_MANIFEST]
