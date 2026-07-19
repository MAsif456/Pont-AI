"""Models describing the coordination architecture for the UI.

These expose the MCP-style tool manifest grouped by domain, plus static
presentation metadata, so the frontend can render the multi-agent / MCP flow
from real data rather than a hard-coded picture.
"""

from typing import Any

from pydantic import BaseModel, Field


class ToolInfo(BaseModel):
    """One tool a domain's MCP server exposes."""

    name: str
    description: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class DomainServer(BaseModel):
    """A domain, its MCP server, the agent that owns it, and its tools."""

    domain: str  # "clinical" | "social_care" | "family"
    agent_label: str  # "Clinical Agent" | "Social Care Agent" | "Family Agent"
    mcp_server: str  # e.g. "clinical-mcp"
    data_sources: list[str] = Field(default_factory=list)
    # Only the Social Care domain runs a live reasoning loop in this build; the
    # others are bounded domain services. This drives the honesty badge in the UI.
    is_reasoning_agent: bool = False
    tools: list[ToolInfo] = Field(default_factory=list)


class ArchitectureResponse(BaseModel):
    """The whole coordination architecture: domains plus orchestration labels."""

    servers: list[DomainServer]
    orchestration_label: str = "AI Orchestration Platform"
    care_plan_label: str = "Dynamic Care Plan"
