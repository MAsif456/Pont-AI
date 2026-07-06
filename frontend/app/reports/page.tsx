"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/Badges";
import { listCases } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";

// Every assessed case carries a referral report, so Reports lists those cases and
// links through to the report on the case detail view.
export default function ReportsPage() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch(() => setError("Could not load reports (is the backend running?)."));
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      <p className="mt-1 text-sm text-gray-500">Generated referral reports across the caseload.</p>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {cases?.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          No reports yet — run a referral to generate one.
        </p>
      )}

      {cases && cases.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Top recommendation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.case_id} className="border-t border-gray-100 hover:bg-blue-50/40">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/cases/${item.case_id}`} className="text-blue-700 hover:underline">
                      {item.patient_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.top_service ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(item.assessed_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
