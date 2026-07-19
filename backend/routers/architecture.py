"""Endpoint: GET /architecture -- the coordination architecture for the UI.

Groups the MCP-style tool manifest by domain and attaches presentation metadata
so the frontend can draw the data-sources -> MCP servers -> agents ->
orchestration -> care-plan flow from real data.
"""

from fastapi import APIRouter

from models.architecture import ArchitectureResponse, DomainServer, ToolInfo
from tools.registry import TOOL_MANIFEST

router = APIRouter(tags=["architecture"])

# Static presentation metadata per domain. Ordered clinical -> social_care ->
# family to match the target architecture diagram, top to bottom.
_DOMAIN_META: dict[str, dict] = {
    "clinical": {
        "agent_label": "Clinical Agent",
        "mcp_server": "Clinical MCP Server",
        "data_sources": ["WICCS", "Mosaic", "DOTI"],
    },
    "social_care": {
        "agent_label": "Social Care Agent",
        "mcp_server": "Social Care MCP Server",
        "data_sources": ["WICCS", "Mosaic", "DOTI"],
    },
    "family": {
        "agent_label": "Family Agent",
        "mcp_server": "F&F MCP Server",
        "data_sources": ["Friends & Family", "Community"],
    },
}
_DOMAIN_ORDER = ["clinical", "social_care", "family"]


@router.get("/architecture", response_model=ArchitectureResponse)
def architecture() -> ArchitectureResponse:
    """Return the domains, their MCP servers, and the tools each exposes."""
    tools_by_domain: dict[str, list[ToolInfo]] = {domain: [] for domain in _DOMAIN_ORDER}
    for tool in TOOL_MANIFEST:
        tools_by_domain.setdefault(tool["domain"], []).append(
            ToolInfo(
                name=tool["name"],
                description=tool["description"],
                parameters=tool.get("parameters", {}),
            )
        )

    servers = [
        DomainServer(
            domain=domain,
            agent_label=_DOMAIN_META[domain]["agent_label"],
            mcp_server=_DOMAIN_META[domain]["mcp_server"],
            data_sources=_DOMAIN_META[domain]["data_sources"],
            is_reasoning_agent=domain == "social_care",
            tools=tools_by_domain.get(domain, []),
        )
        for domain in _DOMAIN_ORDER
    ]
    return ArchitectureResponse(servers=servers)
