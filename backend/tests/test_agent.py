"""Tests for the Social Care Agent's bounded, predictable loop."""

from agents.social_care_agent import MAX_TOOL_CALLS, SocialCareAgent
from models.api import RunAgentRequest
from models.patient import PatientIntake, SourceNoteInput


def _agent(mock_llm, ingested_store) -> SocialCareAgent:
    return SocialCareAgent(mock_llm, ingested_store)


def test_loop_is_bounded_for_every_patient(mock_llm, ingested_store, patients):
    """No patient may ever exceed the hard tool-call cap."""
    agent = _agent(mock_llm, ingested_store)
    for record in patients:
        result = agent.run(RunAgentRequest(patient_id=record["patient_id"]))
        assert result.tool_calls_used <= MAX_TOOL_CALLS
        assert result.reasoning_trail
        assert result.reasoning_trail[0].tool == "extract_needs"


def test_simple_case_loops_less_than_complex_case(mock_llm, ingested_store):
    """A mild, low-risk patient should finalise earlier than a severe one."""
    agent = _agent(mock_llm, ingested_store)
    simple = agent.run(RunAgentRequest(patient_id="PT-010"))  # mild, stable
    complex_case = agent.run(RunAgentRequest(patient_id="PT-003"))  # severe, conflicting
    assert simple.tool_calls_used < complex_case.tool_calls_used


def test_patient_id_run_includes_context_and_recommendations(mock_llm, ingested_store):
    agent = _agent(mock_llm, ingested_store)
    result = agent.run(RunAgentRequest(patient_id="PT-002"))
    assert result.clinical_context is not None
    assert result.family_context is not None
    assert result.recommendations
    # The reasoning trail must log the context-domain queries.
    tools_used = {step.tool for step in result.reasoning_trail}
    assert {"get_clinical_context", "get_family_context", "search_services"} <= tools_used


def test_raw_intake_run_without_patient_id(mock_llm, ingested_store):
    """Raw intake has no stored record, so context lookups are skipped."""
    agent = _agent(mock_llm, ingested_store)
    request = RunAgentRequest(
        patient_data=PatientIntake(
            diagnosis_stage="moderate", living_situation="lives alone",
            mobility="uses walking aid", cognitive_notes="falls risk, social isolation",
        ),
        source_notes=[SourceNoteInput(source="Social Worker", text="falls risk, lives alone")],
        patient_name="Test Person",
    )
    result = agent.run(request)
    assert result.clinical_context is None
    assert result.family_context is None
    assert result.recommendations
    assert result.tool_calls_used <= MAX_TOOL_CALLS
