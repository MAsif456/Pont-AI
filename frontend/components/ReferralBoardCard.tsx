import Link from "next/link";

import {
  REFERRAL_SOURCE_LABEL,
  SCREENING_OUTCOME_LABEL,
  timeAgo,
} from "@/lib/format";
import type { Referral } from "@/lib/types";
import VerificationFlag from "./VerificationFlag";

// Left-border colour follows the status groups in the spec, so the board is
// scannable at a glance (the explicit complaint about the spreadsheet).
const BORDER: Record<string, string> = {
  new: "border-l-gray-300",
  screened: "border-l-gray-300",
  assigned: "border-l-amber-400",
  in_progress: "border-l-amber-400",
  report_ready: "border-l-green-500",
  approved: "border-l-green-500",
  closed_information_only: "border-l-gray-200",
  closed_redirected: "border-l-gray-200",
};

export default function ReferralBoardCard({ referral }: { referral: Referral }) {
  const closed = referral.status.startsWith("closed_");
  return (
    <Link
      href={`/referrals/${referral.referral_id}`}
      className={`block rounded-md border border-l-4 border-gray-200 bg-white p-3 transition hover:shadow-sm ${
        BORDER[referral.status]
      } ${closed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-gray-900">{referral.patient_name}</span>
        <span className="shrink-0 text-xs text-gray-400">{timeAgo(referral.referred_at)}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{REFERRAL_SOURCE_LABEL[referral.source]}</p>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{referral.reason_for_referral}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {referral.screening_outcome && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {SCREENING_OUTCOME_LABEL[referral.screening_outcome]}
          </span>
        )}
        {referral.assigned_worker && (
          <span className="text-xs text-gray-500">👤 {referral.assigned_worker}</span>
        )}
        {referral.verification_flag && <VerificationFlag flag={referral.verification_flag} compact />}
      </div>
    </Link>
  );
}
