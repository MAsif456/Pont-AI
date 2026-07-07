// Orchestrates the pipeline the UI runs: agent, then report, then persist the
// run as a case so it appears on the dashboard and builds patient history.

import {
  createCase,
  generateReport,
  runSocialCareAgent,
  type RunAgentRequest,
} from "./api";
import type { PipelineResult } from "./types";

export async function runPipeline(
  request: RunAgentRequest,
): Promise<PipelineResult> {
  const agent = await runSocialCareAgent(request);

  // When details were not supplied (e.g. a PDF upload), fall back to what the
  // agent read out of the document so the report is populated either way.
  const details = agent.needs_profile.patient_details;
  const patientName =
    request.patient_name?.trim() ||
    details?.name?.trim() ||
    agent.patient_id ||
    "Unnamed patient";
  const patientData =
    request.patient_data ?? (details as unknown as Record<string, unknown>);

  const report = await generateReport(agent, patientName);

  const { case_id } = await createCase({
    patient_id: request.patient_id ?? null,
    patient_name: patientName,
    agent_result: agent,
    report,
  });

  return {
    agent,
    report,
    patientName,
    caseId: case_id,
    patientData,
  };
}
