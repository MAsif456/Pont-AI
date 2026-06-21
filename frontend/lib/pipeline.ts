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
  const report = await generateReport(agent, request.patient_name);
  const patientName =
    request.patient_name || agent.patient_id || "Unnamed patient";

  const { case_id } = await createCase({
    patient_id: request.patient_id ?? null,
    patient_name: patientName,
    agent_result: agent,
    report,
  });

  return { agent, report, patientName: request.patient_name, caseId: case_id };
}
