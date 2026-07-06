"use client";

import { useEffect, useMemo, useState } from "react";

import NewReferralModal from "@/components/NewReferralModal";
import ReferralBoardCard from "@/components/ReferralBoardCard";
import { listReferrals } from "@/lib/api";
import type { Referral, ReferralSource, ReferralStatus } from "@/lib/types";

const COLUMNS: {
  title: string;
  statuses: ReferralStatus[];
  border: string;
  dot: string;
}[] = [
  { title: "New / Screening", statuses: ["new", "screened"], border: "border-t-gray-300", dot: "bg-gray-400" },
  { title: "Assigned / In Progress", statuses: ["assigned", "in_progress"], border: "border-t-amber-400", dot: "bg-amber-500" },
  { title: "Report Ready", statuses: ["report_ready"], border: "border-t-blue-500", dot: "bg-blue-500" },
  {
    title: "Approved / Closed",
    statuses: ["approved", "closed_information_only", "closed_redirected"],
    border: "border-t-green-500",
    dot: "bg-green-500",
  },
];

const SOURCE_FILTERS: { label: string; sources: ReferralSource[] }[] = [
  { label: "Ward Nursing", sources: ["ward_nursing"] },
  { label: "OT / Discharge Liaison", sources: ["ot", "discharge_liaison"] },
  { label: "Community Social Worker", sources: ["community_social_worker"] },
  { label: "Self / Family Referral", sources: ["self_family"] },
];

export default function BoardPage() {
  const [referrals, setReferrals] = useState<Referral[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sourceIdx, setSourceIdx] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  function load() {
    listReferrals()
      .then((list) => setReferrals([...list].sort((a, b) => b.referred_at.localeCompare(a.referred_at))))
      .catch(() => setError("Could not load referrals (is the backend running?)."));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sources = sourceIdx === null ? null : SOURCE_FILTERS[sourceIdx].sources;
    return (referrals ?? []).filter(
      (r) =>
        (!q || r.patient_name.toLowerCase().includes(q)) &&
        (!sources || sources.includes(r.source)),
    );
  }, [referrals, query, sourceIdx]);

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Board</h1>
          <p className="mt-1 text-sm text-gray-500">All referrals, screened and tracked in one place</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + Log New Referral
        </button>
      </div>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patient name…"
          className="w-64 rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        />
        {SOURCE_FILTERS.map((filter, index) => (
          <button
            key={filter.label}
            onClick={() => setSourceIdx((current) => (current === index ? null : index))}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              sourceIdx === index
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {referrals && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.title}
              column={column}
              items={filtered.filter((r) => column.statuses.includes(r.status))}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewReferralModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </main>
  );
}

function Column({
  column,
  items,
}: {
  column: (typeof COLUMNS)[number];
  items: Referral[];
}) {
  const closed = items.filter((r) => r.status.startsWith("closed_"));
  const open = items.filter((r) => !r.status.startsWith("closed_"));
  return (
    <div className={`rounded-lg border-t-4 bg-gray-50 p-3 ${column.border}`}>
      <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${column.dot}`} />
          {column.title}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">{items.length}</span>
      </h2>
      <div className="flex flex-col gap-3">
        {open.map((referral) => (
          <ReferralBoardCard key={referral.referral_id} referral={referral} />
        ))}
        {closed.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-gray-500">{closed.length} closed</summary>
            <div className="mt-2 flex flex-col gap-3">
              {closed.map((referral) => (
                <ReferralBoardCard key={referral.referral_id} referral={referral} />
              ))}
            </div>
          </details>
        )}
        {items.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-gray-400">Nothing here.</p>
        )}
      </div>
    </div>
  );
}
