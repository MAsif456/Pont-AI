// Small display helpers shared across the case views.

import type {
  CaseloadStatus,
  CaseStatus,
  ReferralSource,
  ReferralStatus,
  ScreeningOutcome,
} from "./types";

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export const CASELOAD_STATUS_LABEL: Record<CaseloadStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  referred: "Referred",
};

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  new: "New",
  screened: "Screened",
  assigned: "Assigned",
  in_progress: "In progress",
  report_ready: "Report ready",
  approved: "Approved",
  closed_information_only: "Closed — information only",
  closed_redirected: "Closed — redirected",
};

export const REFERRAL_SOURCE_LABEL: Record<ReferralSource, string> = {
  ward_nursing: "Ward nursing",
  ot: "Occupational therapy",
  discharge_liaison: "Discharge liaison",
  community_social_worker: "Community social worker",
  self_family: "Self / family",
};

export const SCREENING_OUTCOME_LABEL: Record<ScreeningOutcome, string> = {
  information_only: "Information only",
  redirect: "Redirect",
  proportionate_assessment: "Proportionate assessment",
};

// Compact "time since" for the coordination board (the spreadsheet showed ages).
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
