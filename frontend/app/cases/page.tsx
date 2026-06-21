"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfidenceBadge, StatusBadge } from "@/components/Badges";
import StatStrip from "@/components/StatStrip";
import { getCaseStats, listCases } from "@/lib/api";
import { formatDate, STATUS_LABEL } from "@/lib/format";
import type { CaseStats, CaseStatus, CaseSummary } from "@/lib/types";

type Filter = CaseStatus | "all";

export default function CasesDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    Promise.all([listCases(), getCaseStats()])
      .then(([list, summary]) => {
        setCases(list);
        setStats(summary);
      })
      .catch(() => setError("Could not load cases (is the backend running?)."));
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Case dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Every patient assessed by Pont.</p>
        </div>
        <Link
          href="/intake"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + New referral
        </Link>
      </div>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {stats && (
        <div className="mt-6">
          <StatStrip stats={stats} />
        </div>
      )}

      <div className="mt-6">
        {cases === null && !error && <p className="text-sm text-gray-400">Loading…</p>}
        {cases?.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
            No cases yet.{" "}
            <Link href="/intake" className="text-blue-600 hover:underline">
              Run your first referral →
            </Link>
          </div>
        )}
        {cases && cases.length > 0 && (
          <>
            <FilterBar cases={cases} filter={filter} onChange={setFilter} />
            <CaseList
              cases={cases.filter((c) => filter === "all" || c.status === filter)}
              filterLabel={filter === "all" ? null : STATUS_LABEL[filter]}
              onOpen={(id) => router.push(`/cases/${id}`)}
            />
          </>
        )}
      </div>
    </main>
  );
}

const FILTERS: Filter[] = ["all", "pending_review", "approved", "changes_requested"];

function FilterBar({
  cases,
  filter,
  onChange,
}: {
  cases: CaseSummary[];
  filter: Filter;
  onChange: (next: Filter) => void;
}) {
  const count = (value: Filter) =>
    value === "all" ? cases.length : cases.filter((c) => c.status === value).length;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {FILTERS.map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            filter === value
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
        >
          {value === "all" ? "All" : STATUS_LABEL[value]} ({count(value)})
        </button>
      ))}
    </div>
  );
}

function CaseList({
  cases,
  filterLabel,
  onOpen,
}: {
  cases: CaseSummary[];
  filterLabel: string | null;
  onOpen: (id: string) => void;
}) {
  if (cases.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        No cases with status “{filterLabel}”.
      </p>
    );
  }
  return <CaseTable cases={cases} onOpen={onOpen} />;
}

function CaseTable({ cases, onOpen }: { cases: CaseSummary[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Assessed</th>
            <th className="px-4 py-3">Top recommendation</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Flags</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr
              key={item.case_id}
              onClick={() => onOpen(item.case_id)}
              className="cursor-pointer border-t border-gray-100 hover:bg-blue-50/50"
            >
              <td className="px-4 py-3 font-medium">
                {item.patient_name}
                {item.assessment_count > 1 && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({item.assessment_count} assessments)
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(item.assessed_date)}</td>
              <td className="px-4 py-3">
                {item.top_service ?? <span className="text-gray-400">None</span>}
                {item.top_category && (
                  <span className="block text-xs text-gray-400">{item.top_category}</span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.top_confidence ? <ConfidenceBadge confidence={item.top_confidence} /> : "—"}
              </td>
              <td className="px-4 py-3">
                {item.discrepancy_count > 0 ? (
                  <span className="text-amber-600">⚠ {item.discrepancy_count}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
