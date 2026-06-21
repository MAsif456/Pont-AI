import type { CaseStatus, Confidence } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";

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
