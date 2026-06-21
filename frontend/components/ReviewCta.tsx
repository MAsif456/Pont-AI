"use client";

import Link from "next/link";
import { useState } from "react";

import { updateCaseStatus } from "@/lib/api";
import type { CaseStatus } from "@/lib/types";

// The human-in-the-loop approval step. The decision is persisted to the case
// (so it shows on the dashboard), but a referral is never auto-actioned -- a
// person must make this call.
export default function ReviewCta({ caseId }: { caseId?: string }) {
  const [status, setStatus] = useState<CaseStatus>("pending_review");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(next: CaseStatus) {
    setStatus(next); // optimistic
    if (!caseId) return;
    setBusy(true);
    setError(null);
    try {
      await updateCaseStatus(caseId, next);
    } catch {
      setError("Could not save the decision to the case.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-center">
      <p className="text-sm text-gray-600">
        This draft requires a care coordinator&apos;s review before any referral is made.
      </p>

      {status === "approved" && (
        <p className="mt-3 font-medium text-green-600">✓ Marked as reviewed and approved</p>
      )}
      {status === "changes_requested" && (
        <p className="mt-3 font-medium text-amber-600">↩ Sent back for changes</p>
      )}
      {status === "pending_review" && (
        <div className="mt-3 flex justify-center gap-3">
          <button
            disabled={busy}
            onClick={() => decide("approved")}
            className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            Approve referral
          </button>
          <button
            disabled={busy}
            onClick={() => decide("changes_requested")}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-50"
          >
            Request changes
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <Link href="/cases" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        View all cases →
      </Link>
    </section>
  );
}
