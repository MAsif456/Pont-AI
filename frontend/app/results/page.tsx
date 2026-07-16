"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DomainBar from "@/components/DomainBar";
import EditablePatientSummary from "@/components/EditablePatientSummary";
import RecommendationList from "@/components/RecommendationList";
import RelatedContextPanel from "@/components/RelatedContextPanel";
import StaffInteractionsPanel from "@/components/StaffInteractionsPanel";
import { updateCaseStatus } from "@/lib/api";
import { loadResult, saveApproval } from "@/lib/storage";
import type { PipelineResult } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    // sessionStorage is client-only, so it must be read after mount. Reading it
    // in an effect (rather than a lazy initial state) avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(loadResult());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  if (ready && !result) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-gray-500">No assessment to show yet.</p>
        <Link href="/intake" className="mt-3 inline-block text-blue-600 hover:underline">Start an assessment →</Link>
      </main>
    );
  }
  if (!result) return <main className="p-8 text-gray-400">Loading…</main>;

  const { agent, patientName, patientData, caseId } = result;
  const patientId = agent.patient_id;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  function approve() {
    if (caseId) updateCaseStatus(caseId, "approved").catch(() => {});
    saveApproval({ patientName, services: agent.recommendations });
    router.push("/approved");
  }

  function sendChangeRequest() {
    if (caseId) updateCaseStatus(caseId, "changes_requested").catch(() => {});
    setShowChanges(false);
    router.push("/cases");
  }

  return (
    <>
      <DomainBar />
      <main className="mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Pending Human Review
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Referral Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              {[patientName, today].filter(Boolean).join(" · ")}
            </p>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  {reviewed ? "Discrepancy reviewed" : "Discrepancy detected"}
                </h2>
                {agent.discrepancies.map((discrepancy, index) => (
                  <p key={index} className="mt-1 text-sm text-amber-900">
                    {reviewed && <span className="font-medium">Reviewed: </span>}
                    {discrepancy.description}
                  </p>
                ))}
              </div>
              {!reviewed && (
                <button
                  onClick={() => setReviewed(true)}
                  className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                >
                  Mark as reviewed
                </button>
              )}
            </div>
          </section>
        )}

        {(agent.clinical_context || agent.family_context) && (
          <div className="mt-6">
            <RelatedContextPanel clinical={agent.clinical_context} family={agent.family_context} />
          </div>
        )}

        <div className="mt-6">
          <RecommendationList recommendations={agent.recommendations} />
        </div>

        {patientId && (
          <div className="mt-6">
            <StaffInteractionsPanel patientId={patientId} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setShowChanges(true)}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Request Changes
          </button>
          <button
            onClick={approve}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Approve Referral
          </button>
        </div>
      </main>

      {showChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Request Changes</h2>
              <button onClick={() => setShowChanges(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Describe the changes required before this referral can be approved. Your request will be sent to the assessing social worker.
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700">Changes required</label>
            <textarea
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              rows={4}
              placeholder="e.g. Please clarify the personal care discrepancy with the ward nursing team before submitting. Also confirm the OT assessment timeline."
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowChanges(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={sendChangeRequest}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Send request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
