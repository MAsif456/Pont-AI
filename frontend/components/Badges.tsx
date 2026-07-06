import type { CaseloadStatus, CaseStatus, Confidence, ReferralStatus } from "@/lib/types";
import { CASELOAD_STATUS_LABEL, REFERRAL_STATUS_LABEL, STATUS_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<CaseStatus, string> = {
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-orange-100 text-orange-700",
};

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_STYLE[confidence]}`}>
      {confidence}
    </span>
  );
}

const REFERRAL_STATUS_STYLE: Record<ReferralStatus, string> = {
  new: "bg-gray-100 text-gray-700",
  screened: "bg-gray-100 text-gray-700",
  assigned: "bg-amber-100 text-amber-800",
  in_progress: "bg-amber-100 text-amber-800",
  report_ready: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  closed_information_only: "bg-gray-100 text-gray-400",
  closed_redirected: "bg-gray-100 text-gray-400",
};

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${REFERRAL_STATUS_STYLE[status]}`}>
      {REFERRAL_STATUS_LABEL[status]}
    </span>
  );
}

const CASELOAD_STATUS_STYLE: Record<CaseloadStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  pending_review: "bg-amber-100 text-amber-800",
  referred: "bg-green-100 text-green-700",
};

export function CaseloadStatusBadge({ status }: { status: CaseloadStatus }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CASELOAD_STATUS_STYLE[status]} border-transparent`}
    >
      {CASELOAD_STATUS_LABEL[status]}
    </span>
  );
}

const STAGE_STYLE: Record<string, string> = {
  mild: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-800",
  severe: "bg-red-100 text-red-700",
};

export function StageBadge({ stage }: { stage: string }) {
  if (!stage) return <span className="text-gray-300">—</span>;
  const style = STAGE_STYLE[stage.toLowerCase()] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {stage}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
      {initials || "?"}
    </span>
  );
}
