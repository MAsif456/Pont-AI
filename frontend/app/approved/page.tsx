"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadApproval, type ApprovalRecord } from "@/lib/storage";

export default function ApprovedPage() {
  const [approval, setApproval] = useState<ApprovalRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // sessionStorage is client-only, so it must be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApproval(loadApproval());
    setReady(true);
  }, []);

  if (ready && !approval) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-gray-500">No referral to confirm.</p>
        <Link href="/cases" className="mt-3 inline-block text-blue-600 hover:underline">Return to dashboard →</Link>
      </main>
    );
  }
  if (!approval) return <main className="p-8 text-gray-400">Loading…</main>;

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-lg p-8">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4 12 14.01l-3-3" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Referral Approved &amp; Submitted</h1>
        <p className="mt-1 text-sm text-gray-500">
          {approval.patientName ?? "Patient"} · {today}
        </p>
        <p className="mt-1 text-sm text-gray-400">Reference: {approval.reference}</p>

        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Services referred</p>
          <ul className="mt-2 space-y-2">
            {approval.services.map((service) => (
              <li key={service.service_id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-green-600">✓</span>
                <span>
                  <span className="font-medium text-gray-800">{service.name}</span>
                  <span className="block text-xs text-gray-400">
                    {service.category}
                    {service.phone && ` · ${service.phone}`}
                  </span>
                </span>
              </li>
            ))}
            {approval.services.length === 0 && (
              <li className="text-sm text-gray-400">No services were included.</li>
            )}
          </ul>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Download PDF copy
          </button>
          <Link href="/intake" className="block w-full rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
            + Start new assessment
          </Link>
          <Link href="/cases" className="block w-full rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
