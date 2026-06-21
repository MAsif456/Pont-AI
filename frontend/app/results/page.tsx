"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import DiscrepancyAlert from "@/components/DiscrepancyAlert";
import NeedsProfileView from "@/components/NeedsProfileView";
import ReasoningTrail from "@/components/ReasoningTrail";
import RecommendationList from "@/components/RecommendationList";
import RelatedContextPanel from "@/components/RelatedContextPanel";
import ReportView from "@/components/ReportView";
import ReviewCta from "@/components/ReviewCta";
import { loadResult } from "@/lib/storage";
import type { PipelineResult } from "@/lib/types";

export default function ResultsPage() {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // sessionStorage is only available client-side, so it must be read after
    // mount. A lazy initial state would diverge from the server-rendered HTML and
    // cause a hydration mismatch, so reading in an effect is the correct approach.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(loadResult());
    setReady(true);
  }, []);

  if (ready && !result) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-gray-500">No referral to show yet.</p>
        <Link href="/intake" className="mt-3 inline-block text-blue-600 hover:underline">
          Start a referral →
        </Link>
      </main>
    );
  }

  if (!result) {
    return <main className="mx-auto max-w-2xl p-8 text-gray-400">Loading…</main>;
  }

  const { agent, report, patientName } = result;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <Link href="/intake" className="text-sm text-blue-600 hover:underline">
          ← New referral
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {patientName ?? "Referral result"}
        </h1>
      </div>

      <DiscrepancyAlert discrepancies={agent.discrepancies} />
      <NeedsProfileView profile={agent.needs_profile} />
      <RelatedContextPanel clinical={agent.clinical_context} family={agent.family_context} />

      <RecommendationList recommendations={agent.recommendations} />

      <ReasoningTrail steps={agent.reasoning_trail} toolCalls={agent.tool_calls_used} />
      <ReportView report={report} />
      <ReviewCta caseId={result.caseId} />
    </main>
  );
}
