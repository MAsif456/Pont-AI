"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ReferralBoardCard from "@/components/ReferralBoardCard";
import { listReferrals } from "@/lib/api";
import type { Referral, ReferralStatus } from "@/lib/types";

// The four colour bands from the spec become four columns, replacing the
// colour-coded spreadsheet with something immediately scannable.
const COLUMNS: { title: string; statuses: ReferralStatus[]; accent: string }[] = [
  { title: "Incoming", statuses: ["new", "screened"], accent: "text-gray-600" },
  { title: "Active", statuses: ["assigned", "in_progress"], accent: "text-amber-600" },
  { title: "Ready / Approved", statuses: ["report_ready", "approved"], accent: "text-green-600" },
  {
    title: "Closed",
    statuses: ["closed_information_only", "closed_redirected"],
    accent: "text-gray-400",
  },
];

export default function BoardPage() {
  const [referrals, setReferrals] = useState<Referral[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReferrals()
      .then((list) =>
        setReferrals(
          [...list].sort((a, b) => b.referred_at.localeCompare(a.referred_at)),
        ),
      )
      .catch(() => setError("Could not load referrals (is the backend running?)."));
  }, []);

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Coordination board</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every incoming referral, triaged and tracked — replacing the manual spreadsheet.
          </p>
        </div>
        <Link
          href="/cases"
          className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Case dashboard →
        </Link>
      </div>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {referrals === null && !error && <p className="mt-6 text-sm text-gray-400">Loading…</p>}

      {referrals && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = referrals.filter((r) => column.statuses.includes(r.status));
            return (
              <div key={column.title} className="rounded-lg bg-gray-50 p-3">
                <h2 className={`mb-3 flex items-center justify-between text-sm font-semibold ${column.accent}`}>
                  {column.title}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                    {items.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((referral) => (
                    <ReferralBoardCard key={referral.referral_id} referral={referral} />
                  ))}
                  {items.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-gray-400">Nothing here.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
