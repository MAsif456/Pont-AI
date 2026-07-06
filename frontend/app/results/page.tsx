"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DomainBar from "@/components/DomainBar";
import ReasoningTrail from "@/components/ReasoningTrail";
import RelatedContextPanel from "@/components/RelatedContextPanel";
import ServiceSelectCard from "@/components/ServiceSelectCard";
import { updateCaseStatus } from "@/lib/api";
import { loadResult, saveApproval } from "@/lib/storage";
import type { PipelineResult } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [activeNeed, setActiveNeed] = useState<string | null>(null);
  const [included, setIncluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    // sessionStorage is client-only, so it must be read after mount. Reading it
    // in an effect (rather than a lazy initial state) avoids a hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    const loaded = loadResult();
    setResult(loaded);
    setIncluded(new Set(loaded?.agent.recommendations.map((r) => r.service_id) ?? []));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
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
  const subtitle = [
    patientName,
    patientData?.age,
    patientData?.postcode_area,
    [agent.needs_profile.dementia_stage, patientData?.dementia_type].filter(Boolean).join(" "),
  ].filter(Boolean).join(" · ");

  function toggle(id: string) {
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function approve() {
    if (caseId) updateCaseStatus(caseId, "approved").catch(() => {});
    saveApproval({ patientName, services: agent.recommendations.filter((r) => included.has(r.service_id)) });
    router.push("/approved");
  }

  return (
    <>
      <DomainBar />
      <main className="mx-auto max-w-3xl p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assessment Results</h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            Assessment complete
          </span>
        </div>

        {agent.discrepancies.length > 0 && (
          <section className="mt-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  {reviewed ? "Discrepancy reviewed" : "⚠ Discrepancy Detected"}
                </h2>
                {agent.discrepancies.map((d, i) => (
                  <p key={i} className="mt-1 text-sm text-amber-900">{d.description}</p>
                ))}
              </div>
              {!reviewed && (
                <button onClick={() => setReviewed(true)} className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
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

        {agent.needs_profile.key_risks.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-500">Needs summary</h2>
            <p className="text-xs text-gray-400">Click a need to highlight related services.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.needs_profile.key_risks.map((need) => (
                <button
                  key={need}
                  onClick={() => setActiveNeed((c) => (c === need ? null : need))}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    activeNeed === need ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {need}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-1 text-sm font-semibold text-gray-500">
            Recommended services — {included.size} of {agent.recommendations.length} included
          </h2>
          <p className="mb-3 text-xs text-gray-400">Untick a service to exclude it from the referral.</p>
          <div className="flex flex-col gap-3">
            {agent.recommendations.map((rec) => (
              <ServiceSelectCard
                key={rec.service_id}
                recommendation={rec}
                included={included.has(rec.service_id)}
                onToggle={() => toggle(rec.service_id)}
                highlighted={Boolean(activeNeed && matchesNeed(rec, activeNeed))}
              />
            ))}
          </div>
        </section>

        <div className="mt-6">
          <ReasoningTrail steps={agent.reasoning_trail} toolCalls={agent.tool_calls_used} />
        </div>

        <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ This report requires human review and approval before any referral is actioned.
        </p>

        {caseId && (
          <Link href={`/cases/${caseId}`} className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
            <span className="text-sm font-medium">Referral Report — {patientName ?? "patient"}</span>
            <span className="text-sm text-blue-600">View full report →</span>
          </Link>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/intake" className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-100">
            Edit Assessment
          </Link>
          <button onClick={approve} className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            Approve and Send Referral
          </button>
        </div>
      </main>
    </>
  );
}

function matchesNeed(rec: PipelineResult["agent"]["recommendations"][number], need: string): boolean {
  const keyword = need.toLowerCase().split(/\s+/)[0];
  return `${rec.justification} ${rec.category} ${rec.name}`.toLowerCase().includes(keyword);
}
