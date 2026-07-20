"use client";

import { useEffect, useState } from "react";

import CoordinationFlow from "@/components/CoordinationFlow";
import CoordinationTimeline from "@/components/CoordinationTimeline";
import RoleGuard from "@/components/RoleGuard";
import { getArchitecture, getCarePlan, getCase, listCases, listReferrals } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
  AgentResult,
  ArchitectureResponse,
  CarePlan,
  CaseSummary,
  ReassessmentRecord,
  Referral,
} from "@/lib/types";

export default function CoordinationPage() {
  return (
    <RoleGuard allow={["social_worker"]}>
      <Coordination />
    </RoleGuard>
  );
}

function Coordination() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [arch, setArch] = useState<ArchitectureResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentResult | null>(null);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCases()
      .then((list) => {
        setCases(list);
        if (list.length > 0) setSelectedId(list[0].case_id);
      })
      .catch(() => setError("Could not load cases (is the backend running?)."));
    listReferrals().then(setReferrals).catch(() => {});
    getArchitecture().then(setArch).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getCase(selectedId)
      .then((data) => {
        if (!active) return;
        setPatientId(data.patient_id);
        setAgent(data.assessments.at(-1)?.agent_result ?? null);
      })
      .catch(() => active && setAgent(null));
    getCarePlan(selectedId)
      .then((data) => active && setPlan(data))
      .catch(() => active && setPlan(null));
    return () => {
      active = false;
    };
  }, [selectedId]);

  const reassessments: ReassessmentRecord[] =
    referrals.find((r) => r.patient_id === patientId)?.reassessments ?? [];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Coordination</h1>
      <p className="mt-1 text-sm text-gray-500">
        The story of each case: who shared or changed what across the ward, social care and family —
        and how Pont reconciled it into one care plan.
      </p>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {cases.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="case" className="text-sm font-medium text-gray-700">Show the story for</label>
            <select
              id="case"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-md border border-gray-300 bg-white p-2 text-sm"
            >
              {cases.map((item) => (
                <option key={item.case_id} value={item.case_id}>
                  {item.patient_name} — {formatDate(item.assessed_date)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            {patientId ? (
              <CoordinationTimeline
                patientId={patientId}
                reassessments={reassessments}
                carePlanVersion={plan?.version}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
                Select a case to see its coordination story.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Run an assessment to see a coordination story for a patient.
        </p>
      )}

      {/* Technical explainer for the supervisor/pitch — hidden by default and not
          shown to the end-user roles at all (this page is Social-Worker only). */}
      {agent && (
        <details className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            How Pont coordinates behind the scenes (technical view)
          </summary>
          <div className="mt-4">
            <CoordinationFlow agent={agent} plan={plan} architecture={arch ?? undefined} />
          </div>
        </details>
      )}
    </main>
  );
}
