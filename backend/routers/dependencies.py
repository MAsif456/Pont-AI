"""Shared, cached request dependencies for the routers.

The vector store opens a persistent Chroma client, so it (and the agent that
holds it) are built once per process rather than per request. Exposing them as
FastAPI dependencies lets tests override them with fakes via
``app.dependency_overrides``.
"""

from functools import lru_cache

from agents.social_care_agent import SocialCareAgent
from core.case_store import CaseStore
from core.clinical_update_store import ClinicalUpdateStore
from core.llm.base import LLMClient
from core.llm.factory import build_llm_client
from core.referral_store import ReferralStore
from core.vector_store import VectorStore


@lru_cache(maxsize=1)
def get_llm() -> LLMClient:
    """Return the process-wide language-model client."""
    return build_llm_client()


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    """Return the process-wide vector store."""
    return VectorStore()


@lru_cache(maxsize=1)
def get_agent() -> SocialCareAgent:
    """Return the process-wide Social Care Agent."""
    return SocialCareAgent(get_llm(), get_vector_store())


@lru_cache(maxsize=1)
def get_case_store() -> CaseStore:
    """Return the process-wide case store."""
    return CaseStore()


@lru_cache(maxsize=1)
def get_referral_store() -> ReferralStore:
    """Return the process-wide referral store."""
    return ReferralStore()


@lru_cache(maxsize=1)
def get_clinical_update_store() -> ClinicalUpdateStore:
    """Return the process-wide clinical-update store."""
    return ClinicalUpdateStore()
