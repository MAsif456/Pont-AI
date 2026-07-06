import Link from "next/link";

import {
  REFERRAL_SOURCE_LABEL,
  SCREENING_OUTCOME_LABEL,
  timeAgo,
} from "@/lib/format";
import type { Referral } from "@/lib/types";

// A scannable referral card for the coordination board. The column carries the
// status colour (top border), so the card itself stays clean.
export default function ReferralBoardCard({ referral }: { referral: Referral }) {
  const closed = referral.status.startsWith("closed_");
  return (
    <Link
      href={`/referrals/${referral.referral_id}`}
      className={`block rounded-md border border-gray-200 bg-white p-3 transition hover:shadow-sm ${
        closed ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-gray-900">{referral.patient_name}</span>
        {referral.verification_flag && (
          <span title="Note conflict — verify" className="shrink-0 text-amber-500">⚠</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{REFERRAL_SOURCE_LABEL[referral.source]}</p>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{referral.reason_for_referral}</p>

      {referral.screening_outcome && (
        <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {SCREENING_OUTCOME_LABEL[referral.screening_outcome]}
        </span>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={referral.assigned_worker ? "text-gray-600" : "text-gray-400"}>
          {referral.assigned_worker ?? "Unassigned"}
        </span>
        <span className="text-gray-400">{timeAgo(referral.referred_at)}</span>
      </div>
    </Link>
  );
}
