"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DomainBar from "@/components/DomainBar";
import EditablePatientSummary from "@/components/EditablePatientSummary";
import RecommendationList from "@/components/RecommendationList";
import RelatedContextPanel from "@/components/RelatedContextPanel";
import StaffInteractionsPanel from "@/components/StaffInteractionsPanel";
import { formatDate } from "@/lib/format";
import { loadApproval, type ApprovalRecord } from "@/lib/storage";

export default function ApprovedPage() {
  const [approval, setApproval] = useState<ApprovalRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // sessionStorage is client-only, so it must be read after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setApproval(loadApproval());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (ready && !approval) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-gray-500">No referral to show.</p>
        <Link href="/cases" className="mt-3 inline-block text-blue-600 hover:underline">Return to dashboard →</Link>
      </main>
    );
  }
  if (!approval) return <main className="p-8 text-gray-400">Loading…</main>;

  const { result, includedIds, reference, approvedAt } = approval;
  const { agent, patientName, patientData } = result;
  const patientId = agent.patient_id;
  const referred = agent.recommendations.filter((rec) => includedIds.includes(rec.service_id));
  const date = formatDate(approvedAt);

  return (
    <>
      <DomainBar />
      <main className="mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Approved
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Referral Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              {[patientName, date].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">Reference: {reference}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex shrink-0 items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download PDF
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border-l-4 border-green-500 bg-green-50 p-4 text-sm text-green-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4 12 14.01l-3-3" />
          </svg>
          Referral approved and submitted{patientName ? ` for ${patientName}` : ""}.
        </div>

        <div className="mt-6">
          <EditablePatientSummary patientName={patientName} patientData={patientData} />
        </div>

        {agent.needs_profile.key_risks.length > 0 && (
          <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Identified needs</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.needs_profile.key_risks.map((need) => {
                const disputed = need.toLowerCase().includes("disput");
                return (
                  <span
                    key={need}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      disputed
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {need}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {agent.discrepancies.length > 0 && (
          <section className="mt-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold text-amber-900">Discrepancy reviewed</h2>
            {agent.discrepancies.map((discrepancy, index) => (
              <p key={index} className="mt-1 text-sm text-amber-900">{discrepancy.description}</p>
            ))}
          </section>
        )}

        {(agent.clinical_context || agent.family_context) && (
          <div className="mt-6">
            <RelatedContextPanel clinical={agent.clinical_context} family={agent.family_context} />
          </div>
        )}


        <div className="mt-6">
          {referred.length > 0 ? (
            <RecommendationList recommendations={referred} />
          ) : (
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Services referred</h2>
              <p className="mt-2 text-sm text-gray-400">No services were included in this referral.</p>
            </section>
          )}
        </div>

        {patientId && (
          <div className="mt-6">
            <StaffInteractionsPanel patientId={patientId} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/intake"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            + Start new assessment
          </Link>
          <Link
            href="/cases"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
