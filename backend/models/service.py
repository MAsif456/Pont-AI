"""Models describing a Cardiff care service and a retrieval result."""

from pydantic import BaseModel, Field


class Service(BaseModel):
    """A single care service from the Cardiff service directory."""

    service_id: str
    name: str
    category: str
    description: str
    eligibility_criteria: str
    postcode_coverage: list[str] = Field(default_factory=list)
    referral_process: str = ""
    capacity_notes: str = ""
    phone: str = ""
    address: str = ""

    def embedding_text(self) -> str:
        """Text used to embed this service for retrieval.

        Combines the fields that carry the most matching signal (name, category,
        description, eligibility) as required by the ingestion spec; capacity and
        referral process are excluded as they add noise rather than relevance.
        """
        return (
            f"{self.name}\n"
            f"Category: {self.category}\n"
            f"{self.description}\n"
            f"Eligibility: {self.eligibility_criteria}"
        )


class RetrievedService(BaseModel):
    """A service returned from the vector store with its similarity distance."""

    service: Service
    # Lower distance means a closer match; exposed so the loop and UI can reason
    # about retrieval quality rather than treating every hit as equally relevant.
    distance: float
