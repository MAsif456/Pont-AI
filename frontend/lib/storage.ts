// Hands data between pages. The prototype has no backend persistence for the
// manual intake flow, so sessionStorage is the simplest carrier.

import type { PipelineResult } from "./types";

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
  // The whole assessment carries through so the approved view can render the
  // full final report, not just the list of referred services.
  result: PipelineResult;
  includedIds: string[];
  reference: string;
  approvedAt: string;
}

export function saveApproval(data: { result: PipelineResult; includedIds: string[] }): void {
  // A human-readable reference for the submitted referral (demo only).
  const reference = `SCR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const record: ApprovalRecord = {
    ...data,
    reference,
    approvedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(APPROVAL_KEY, JSON.stringify(record));
}

export function loadApproval(): ApprovalRecord | null {
  const raw = sessionStorage.getItem(APPROVAL_KEY);
  return raw ? (JSON.parse(raw) as ApprovalRecord) : null;
}
