"""Endpoint: POST /run-social-care-agent -- runs the bounded agentic loop."""

from fastapi import APIRouter, Depends, HTTPException

from agents.intake import PatientNotFoundError
from agents.social_care_agent import SocialCareAgent
from models.api import RunAgentRequest
from models.referral import AgentResult

from .dependencies import get_agent

router = APIRouter(tags=["pipeline"])


@router.post("/run-social-care-agent", response_model=AgentResult)
def run_social_care_agent(
    request: RunAgentRequest, agent: SocialCareAgent = Depends(get_agent)
) -> AgentResult:
    """Run the Social Care Agent for a patient id or raw intake data."""
    try:
        return agent.run(request)
    except PatientNotFoundError as error:
        # A bad patient id is a client error, not a server fault.
        raise HTTPException(status_code=404, detail=str(error)) from error
