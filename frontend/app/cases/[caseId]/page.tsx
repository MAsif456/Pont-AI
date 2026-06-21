"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AssessmentView from "@/components/AssessmentView";
import { StatusBadge } from "@/components/Badges";
import ReviewCta from "@/components/ReviewCta";
import { getCase } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { PatientCase, StoredAssessment } from "@/lib/types";

export default function CaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const [patientCase, setPatientCase] = useState<PatientCase | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCase(params.caseId)
      .then((loaded) => {
        setPatientCase(loaded);
        setSelectedId(loaded.assessments[loaded.assessments.length - 1].assessment_id);
      })
      .catch(() => setError("Could not load this case."));
  }, [params.caseId]);

  if (error) {
    return <Shell><p className="text-red-600">{error}</p></Shell>;
  }
  if (!patientCase || !selectedId) {
    return <Shell><p className="text-gray-400">Loading…</p></Shell>;
  }

  // Newest first for the timeline; the last item in the array is the latest.
  const ordered = [...patientCase.assessments].reverse();
  const selectedIndex = patientCase.assessments.findIndex((a) => a.assessment_id === selectedId);
  const selected = patientCase.assessments[selectedIndex];
  const previous = selectedIndex > 0 ? patientCase.assessments[selectedIndex - 1] : null;
  const isLatest = selectedIndex === patientCase.assessments.length - 1;
  const latestStatus = patientCase.assessments[patientCase.assessments.length - 1].status;

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{patientCase.patient_name}</h1>
        <StatusBadge status={latestStatus} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {patientCase.patient_id ? `Patient ${patientCase.patient_id} · ` : ""}
        {patientCase.assessments.length} assessment
        {patientCase.assessments.length === 1 ? "" : "s"} on record
      </p>

      {patientCase.assessments.length > 1 && (
        <Timeline ordered={ordered} selectedId={selectedId} onSelect={setSelectedId} />
      )}
      {previous && <ChangeSummary previous={previous} current={selected} />}

      <div className="mt-6">
        <AssessmentView assessment={selected} />
      </div>

      {isLatest && (
        <div className="mt-6">
          <ReviewCta caseId={patientCase.case_id} />
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/cases" className="text-sm text-blue-600 hover:underline">
        ← Case dashboard
      </Link>
      <div className="mt-2">{children}</div>
    </main>
  );
}

function Timeline({
  ordered,
  selectedId,
  onSelect,
}: {
  ordered: StoredAssessment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {ordered.map((assessment, index) => {
        const isLatest = index === 0;
        const active = assessment.assessment_id === selectedId;
        return (
          <button
            key={assessment.assessment_id}
            onClick={() => onSelect(assessment.assessment_id)}
            className={`rounded-md border px-3 py-2 text-left text-xs transition ${
              active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="font-medium text-gray-700">
              {isLatest ? "Latest" : `Assessment ${ordered.length - index}`}
            </div>
            <div className="text-gray-400">{formatDateTime(assessment.created_at)}</div>
          </button>
        );
      })}
    </div>
  );
}

function ChangeSummary({
  previous,
  current,
}: {
  previous: StoredAssessment;
  current: StoredAssessment;
}) {
  const changes = computeChanges(previous, current);
  if (changes.length === 0) return null;
  return (
    <section className="mt-5 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
      <h2 className="text-sm font-semibold text-blue-900">Changes since the previous assessment</h2>
      <ul className="mt-2 space-y-1 text-sm text-blue-900">
        {changes.map((change) => (
          <li key={change}>• {change}</li>
        ))}
      </ul>
    </section>
  );
}

function computeChanges(previous: StoredAssessment, current: StoredAssessment): string[] {
  const before = previous.agent_result;
  const after = current.agent_result;
  const changes: string[] = [];
  if (before.needs_profile.dementia_stage !== after.needs_profile.dementia_stage) {
    changes.push(
      `Dementia stage: ${before.needs_profile.dementia_stage} → ${after.needs_profile.dementia_stage}`,
    );
  }
  if (before.needs_profile.key_risks.length !== after.needs_profile.key_risks.length) {
    changes.push(
      `Identified risks: ${before.needs_profile.key_risks.length} → ${after.needs_profile.key_risks.length}`,
    );
  }
  if (before.discrepancies.length !== after.discrepancies.length) {
    changes.push(`Source discrepancies: ${before.discrepancies.length} → ${after.discrepancies.length}`);
  }
  const beforeTop = before.recommendations[0]?.name;
  const afterTop = after.recommendations[0]?.name;
  if (beforeTop !== afterTop) {
    changes.push(`Top recommendation: ${beforeTop ?? "none"} → ${afterTop ?? "none"}`);
  }
  return changes;
}
