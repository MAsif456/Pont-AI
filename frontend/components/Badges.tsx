import type { CaseStatus, Confidence, ReferralStatus } from "@/lib/types";
import { REFERRAL_STATUS_LABEL, STATUS_LABEL } from "@/lib/format";

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
