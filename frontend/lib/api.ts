// Thin client for the Pont backend. All calls go through one fetch helper so error
// handling and the base URL live in a single place.

import type {
  AgentResult,
  CaseStats,
  CaseStatus,
  CaseSummary,
  PatientCase,
  PatientSummary,
  ReferralReport,
  SourceNoteInput,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    // Network-level failure: the backend is almost certainly not running.
    throw new ApiError(
      "Could not reach the Pont backend. Is it running on " + API_BASE + "?",
    );
  }
  if (!response.ok) {
    throw new ApiError(await readError(response));
  }
  return response.json() as Promise<T>;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.detail ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export function listPatients(): Promise<PatientSummary[]> {
  return request<PatientSummary[]>("/patients");
}

export interface RunAgentRequest {
  patient_id?: string;
  patient_data?: Record<string, unknown>;
  raw_text?: string;
  source_notes?: SourceNoteInput[];
  patient_name?: string;
}

export function runSocialCareAgent(body: RunAgentRequest): Promise<AgentResult> {
  return request<AgentResult>("/run-social-care-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function generateReport(
  agentResult: AgentResult,
  patientName?: string,
): Promise<ReferralReport> {
  return request<ReferralReport>("/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_result: agentResult, patient_name: patientName }),
  });
}

export interface UploadResult {
  raw_text: string;
  characters_extracted: number;
  warning: string | null;
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResult>("/upload-document", { method: "POST", body: form });
}

// --- Cases (dashboard, history, status) ---

export interface CreateCaseRequest {
  patient_id?: string | null;
  patient_name: string;
  agent_result: AgentResult;
  report: ReferralReport;
}

export function createCase(
  body: CreateCaseRequest,
): Promise<{ case_id: string; assessment_id: string }> {
  return request("/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listCases(): Promise<CaseSummary[]> {
  return request<CaseSummary[]>("/cases");
}

export function getCaseStats(): Promise<CaseStats> {
  return request<CaseStats>("/cases/stats");
}

export function getCase(caseId: string): Promise<PatientCase> {
  return request<PatientCase>(`/cases/${caseId}`);
}

export function updateCaseStatus(
  caseId: string,
  status: CaseStatus,
  note = "",
): Promise<PatientCase> {
  return request<PatientCase>(`/cases/${caseId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
}
