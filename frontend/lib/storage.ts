// Hands data between pages. The prototype has no backend persistence for the
// manual intake flow, so sessionStorage is the simplest carrier.

import type { PipelineResult, Recommendation } from "./types";

const RESULT_KEY = "pont:lastResult";
const APPROVAL_KEY = "pont:approval";

export function saveResult(result: PipelineResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadResult(): PipelineResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  return raw ? (JSON.parse(raw) as PipelineResult) : null;
}

export interface ApprovalRecord {
  patientName?: string;
  services: Recommendation[];
  reference: string;
}

export function saveApproval(data: { patientName?: string; services: Recommendation[] }): void {
  // A human-readable reference for the submitted referral (demo only).
  const reference = `SCR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  sessionStorage.setItem(APPROVAL_KEY, JSON.stringify({ ...data, reference }));
}

export function loadApproval(): ApprovalRecord | null {
  const raw = sessionStorage.getItem(APPROVAL_KEY);
  return raw ? (JSON.parse(raw) as ApprovalRecord) : null;
}
