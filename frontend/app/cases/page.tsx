"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar, CaseloadStatusBadge, StageBadge } from "@/components/Badges";
import Pagination from "@/components/Pagination";
import { getCaseload } from "@/lib/api";
import { CASELOAD_STATUS_LABEL, formatDate } from "@/lib/format";
import type { CaseloadRow, CaseloadStatus } from "@/lib/types";

const PAGE_SIZE = 8;
const FILTERS: CaseloadStatus[] = ["pending_review", "in_progress", "referred", "draft"];

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CaseloadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CaseloadStatus | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCaseload()
      .then(setRows)
      .catch(() => setError("Could not load the caseload (is the backend running?)."));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (row) =>
        (!status || row.status === status) &&
        (!q || row.name.toLowerCase().includes(q) || row.postcode_area.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const stats = useMemo(() => computeStats(rows ?? []), [rows]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function applyFilter(next: CaseloadStatus | null) {
    setStatus((current) => (current === next ? null : next));
    setPage(1);
  }

  function openRow(row: CaseloadRow) {
    if (row.case_id) router.push(`/cases/${row.case_id}`);
    else if (row.referral_id) router.push(`/referrals/${row.referral_id}`);
    else router.push("/intake");
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Cardiff Social Services · Dementia Referral Caseload</p>
        </div>
        <Link
          href="/intake"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + New Assessment
        </Link>
      </div>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total patients" value={stats.total} icon={<UsersIcon />} accent="text-gray-900" />
        <StatCard label="Pending review" value={stats.pending} icon={<ClockIcon />} accent="text-amber-600"
          active={status === "pending_review"} onClick={() => applyFilter("pending_review")} />
        <StatCard label="In progress" value={stats.inProgress} icon={<ActivityIcon />} accent="text-blue-600"
          active={status === "in_progress"} onClick={() => applyFilter("in_progress")} />
        <StatCard label="Referred this week" value={stats.referredThisWeek} icon={<CheckIcon />} accent="text-green-600"
          active={status === "referred"} onClick={() => applyFilter("referred")} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Search patients or postcode…"
          className="w-72 rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        />
        {FILTERS.map((value) => (
          <button
            key={value}
            onClick={() => applyFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              status === value ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {CASELOAD_STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Postcode</th>
              <th className="px-4 py-3">Dementia Type</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row.patient_id}
                onClick={() => openRow(row)}
                className="cursor-pointer border-t border-gray-100 hover:bg-blue-50/40"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} />
                    <span className="font-medium text-gray-900">{row.name}</span>
                    {row.flagged && <span title="Flag on record" className="text-amber-500">⚠</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.age ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{row.postcode_area}</td>
                <td className="px-4 py-3 text-gray-600">{row.dementia_type}</td>
                <td className="px-4 py-3"><StageBadge stage={row.diagnosis_stage} /></td>
                <td className="px-4 py-3"><CaseloadStatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(row.updated_at)}</td>
                <td className="px-4 py-3 text-gray-300">›</td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  No patients match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
    </main>
  );
}

function computeStats(rows: CaseloadRow[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === "pending_review").length,
    inProgress: rows.filter((row) => row.status === "in_progress").length,
    referredThisWeek: rows.filter(
      (row) => row.status === "referred" && new Date(row.updated_at).getTime() >= weekAgo,
    ).length,
  };
}

function StatCard({
  label, value, icon, accent, active, onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`rounded-lg border bg-white p-4 text-left transition ${
        active ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200"
      } ${clickable ? "hover:border-blue-300" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between">
        <span className={accent}>{icon}</span>
        {clickable && <span className="text-[10px] uppercase tracking-wide text-gray-300">Click to filter</span>}
      </div>
      <div className={`mt-2 text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </button>
  );
}

const iconProps = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};
const UsersIcon = () => (
  <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const ClockIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>);
const ActivityIcon = () => (<svg {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
const CheckIcon = () => (<svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></svg>);
