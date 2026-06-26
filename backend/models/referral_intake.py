"""Models for the referral intake and coordination layer.

This sits *in front of* the existing Social Care Agent: incoming referrals are
screened, assigned, and only then handed to the unchanged agent pipeline. Named
``referral_intake`` to avoid any clash with ``models/referral.py`` (which holds
the agent's recommendation/result types).
"""

from typing import Literal

from pydantic import BaseModel, Field

# Where a referral came from (mirrors the sources seen on the ward).
ReferralSource = Literal[
    "ward_nursing", "ot", "discharge_liaison", "community_social_worker", "self_family"
]

# The lifecycle of a referral, from arrival to closure.
ReferralStatus = Literal[
    "new", "screened", "assigned", "in_progress", "report_ready", "approved",
    "closed_information_only", "closed_redirected",
]

# The three screening outcomes a referral can be triaged into.
ScreeningOutcome = Literal["information_only", "redirect", "proportionate_assessment"]


class Referral(BaseModel):
    """A single incoming referral tracked on the coordination board."""

    referral_id: str
    # Links to an existing patient record where one exists; otherwise the referral
    # carries only a display name (a minimal inline stub).
    patient_id: str | None = None
    patient_name: str
    source: ReferralSource
    reason_for_referral: str
    # The two accounts that screening cross-checks: the electronic record and a
    # separate paper/handover note. Either may be absent.
    electronic_note: str | None = None
    handover_note: str | None = None
    referred_at: str
    status: ReferralStatus = "new"
    assigned_worker: str | None = None
    screening_outcome: ScreeningOutcome | None = None
    screening_notes: str | None = None
    # Plain-language description of a factual disagreement between the two notes,
    # or null when none was found.
    verification_flag: str | None = None
    # The case created when this referral is run through the Social Care Agent.
    case_id: str | None = None


class ScreeningResult(BaseModel):
    """Output of the bounded screening call."""

    outcome: ScreeningOutcome
    rationale: str
    verification_flag: str | None = None


class CreateReferralRequest(BaseModel):
    """Input to create a new referral (arrives with status 'new')."""

    patient_name: str
    source: ReferralSource
    reason_for_referral: str
    patient_id: str | None = None
    electronic_note: str | None = None
    handover_note: str | None = None
    # Optional; defaults to now if omitted.
    referred_at: str | None = None


class AssignReferralRequest(BaseModel):
    """Claim a referral for a named worker."""

    worker: str = Field(min_length=1)


class CompleteReferralRequest(BaseModel):
    """Link the case produced by the agent run back to the referral."""

    case_id: str
