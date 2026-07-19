"use client";

import { useEffect, useState } from "react";

import CoordinationFlow from "@/components/CoordinationFlow";
import { getArchitecture, getCarePlan, getCase, listCases } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AgentResult, ArchitectureResponse, CarePlan, CaseSummary, DomainServer } from "@/lib/types";

export default function CoordinationPage() {
  const [arch, setArch] = useState<ArchitectureResponse | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [agent, setAgent] = useState<AgentResult | null>(null);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArchitecture()
      .then(setArch)
      .catch(() => setError("Could not load the architecture (is the backend running?)."));
    // Cases are returned most-recent first, so default to the latest.
    listCases()
      .then((list) => {
        setCases(list);
        if (list.length > 0) setSelectedId(list[0].case_id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getCase(selectedId)
      .then((data) => active && setAgent(data.assessments.at(-1)?.agent_result ?? null))
      .catch(() => active && setAgent(null));
    getCarePlan(selectedId)
      .then((data) => active && setPlan(data))
      .catch(() => active && setPlan(null));
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Coordination</h1>
      <p className="mt-1 text-sm text-gray-500">
        How Pont coordinates information across the clinical, social care and family domains — through
        their MCP servers and into one reconciled Dynamic Care Plan.
      </p>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Section 1 — system architecture (capability view, from the manifest) */}
      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">System architecture</h2>
        <p className="mt-1 text-xs text-gray-400">
          Data sources → MCP servers → domain agents → orchestration → Dynamic Care Plan.
        </p>
        <div className="mt-4 space-y-3">
          {(arch?.servers ?? []).map((server) => (
            <ArchitectureRow key={server.domain} server={server} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400">Then</span>
          <span className="rounded-md border-2 border-blue-200 bg-blue-50/40 px-3 py-1 font-medium text-blue-900">
            {arch?.orchestration_label ?? "AI Orchestration Platform"}
          </span>
          <span className="text-gray-400">→</span>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-700">
            {arch?.care_plan_label ?? "Dynamic Care Plan"}
          </span>
        </div>
      </section>

      {/* Section 2 — legend */}
      <section className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Legend</h2>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
          <span><span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">tool</span> called this run</span>
          <span><span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-medium text-gray-400">tool</span> available capability</span>
          <span><span className="rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-700">reasoning agent</span> live loop</span>
          <span><span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">domain service</span> bounded lookup</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Presented as three Agents to mirror the target architecture. In this build only the Social
          Care Agent runs a live reasoning loop; Clinical and Family are bounded domain services.
        </p>
      </section>

      {/* Section 3 — case selector + Section 4 — live overlay */}
      {cases.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label htmlFor="case" className="text-sm font-medium text-gray-700">Live coordination for</label>
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
            {agent ? (
              <CoordinationFlow agent={agent} plan={plan} architecture={arch ?? undefined} />
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
                Select a case to see its live coordination.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Run an assessment to see live coordination for a patient.
        </p>
      )}
    </main>
  );
}

function ArchitectureRow({ server }: { server: DomainServer }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center">
      <div className="w-full sm:w-40 sm:shrink-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">Data sources</p>
        <p className="text-sm text-gray-600">{server.data_sources.join(" · ")}</p>
      </div>
      <Arrow />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800">{server.mcp_server}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {server.tools.map((tool) => (
            <span key={tool.name} title={tool.description} className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {tool.name}
            </span>
          ))}
        </div>
      </div>
      <Arrow />
      <div className="w-full sm:w-44 sm:shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{server.agent_label}</span>
          {server.is_reasoning_agent ? (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">reasoning</span>
          ) : (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">service</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return <span className="hidden text-gray-300 sm:inline">→</span>;
}
