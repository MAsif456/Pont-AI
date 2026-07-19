"use client";

import { useEffect, useState } from "react";

import { getArchitecture } from "@/lib/api";
import type { AgentResult, ArchitectureResponse, CarePlan, DomainServer } from "@/lib/types";

// Used when the architecture endpoint can't be reached, so the flow still renders.
const FALLBACK: ArchitectureResponse = {
  servers: [
    { domain: "clinical", agent_label: "Clinical Agent", mcp_server: "Clinical MCP Server", data_sources: ["WICCS", "Mosaic", "DOTI"], is_reasoning_agent: false, tools: [] },
    { domain: "social_care", agent_label: "Social Care Agent", mcp_server: "Social Care MCP Server", data_sources: ["WICCS", "Mosaic", "DOTI"], is_reasoning_agent: true, tools: [] },
    { domain: "family", agent_label: "Family Agent", mcp_server: "F&F MCP Server", data_sources: ["Friends & Family", "Community"], is_reasoning_agent: false, tools: [] },
  ],
  orchestration_label: "AI Orchestration Platform",
  care_plan_label: "Dynamic Care Plan",
};

const ACCENT: Record<string, { dot: string; chip: string; ring: string }> = {
  clinical: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200", ring: "border-sky-200" },
  social_care: { dot: "bg-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200", ring: "border-blue-300" },
  family: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200", ring: "border-violet-200" },
};

interface Props {
  agent: AgentResult;
  plan?: CarePlan | null;
  architecture?: ArchitectureResponse;
}

// Visualises the live coordination for one assessment, mapped to the target
// architecture: MCP servers -> three domain Agents -> AI Orchestration Platform
// -> Dynamic Care Plan. Everything highlighted is driven by real run data.
export default function CoordinationFlow({ agent, plan, architecture }: Props) {
  const [fetched, setFetched] = useState<ArchitectureResponse | null>(null);

  useEffect(() => {
    if (architecture) return;
    let active = true;
    getArchitecture()
      .then((data) => active && setFetched(data))
      .catch(() => active && setFetched(FALLBACK));
    return () => {
      active = false;
    };
  }, [architecture]);

  const arch = architecture ?? fetched;
  const servers = arch?.servers ?? FALLBACK.servers;
  const calledTools = new Set(agent.reasoning_trail.map((step) => step.tool));
  const queryCount = (domain: string) =>
    agent.reasoning_trail.filter((step) => step.domain === domain).length;
  const byDomain = (domain: string) => servers.find((s) => s.domain === domain);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Agent coordination</h2>
      <p className="mt-1 text-xs text-gray-400">
        How the domain agents coordinated through their MCP servers for this assessment.
      </p>

      {/* Three domain agents. Social Care (the live reasoning loop) sits in the
          centre and queries the Clinical and Family domains either side. */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <AgentCard server={byDomain("clinical")} agent={agent} calledTools={calledTools} queried={queryCount("clinical") > 0} />
        <Connector count={queryCount("clinical")} />
        <AgentCard server={byDomain("social_care")} agent={agent} calledTools={calledTools} queried />
        <Connector count={queryCount("family")} />
        <AgentCard server={byDomain("family")} agent={agent} calledTools={calledTools} queried={queryCount("family") > 0} />
      </div>

      <DownFlow label="All three domains feed the orchestration" />

      {/* Orchestration node */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50/40 p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19" />
            </svg>
          </span>
          <span className="font-semibold text-blue-900">{arch?.orchestration_label ?? "AI Orchestration Platform"}</span>
          {plan && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">v{plan.version}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">Reconciles the clinical, social care and family records into one plan.</p>
      </div>

      <DownFlow label="Reconciled into" />

      {/* Dynamic Care Plan node */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{arch?.care_plan_label ?? "Dynamic Care Plan"}</h3>
          {plan && <span className="text-xs text-gray-400">{agent.recommendations.length} services</span>}
        </div>
        {plan ? (
          <>
            <p className="mt-1 text-sm text-gray-700">{plan.discharge_recommendation}</p>
            {plan.cross_domain_flags.length > 0 && (
              <div className="mt-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Cross-domain flags</h4>
                <ul className="mt-1 space-y-1 text-sm text-amber-900">
                  {plan.cross_domain_flags.map((flag, index) => (
                    <li key={index}>
                      ⚠ {flag.description}
                      {flag.domains.length > 0 && (
                        <span className="ml-1 text-xs text-amber-700">({flag.domains.join(" · ")})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-gray-400">
            Generated at the referral stage — open the referral to see the reconciled plan.
          </p>
        )}
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
        Presented as three Agents to mirror the target architecture. In this build only the
        Social Care Agent runs a live reasoning loop; Clinical and Family are bounded domain services.
      </p>
    </section>
  );
}

function AgentCard({
  server,
  agent,
  calledTools,
  queried,
}: {
  server?: DomainServer;
  agent: AgentResult;
  calledTools: Set<string>;
  queried: boolean;
}) {
  if (!server) return null;
  const accent = ACCENT[server.domain] ?? ACCENT.social_care;
  return (
    <div className={`flex-1 rounded-lg border ${queried ? accent.ring : "border-gray-200"} bg-white p-4`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
          <span className="text-sm font-semibold text-gray-800">{server.agent_label}</span>
        </div>
        {server.is_reasoning_agent ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">reasoning agent</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">domain service</span>
        )}
      </div>

      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
        {server.mcp_server}
        {server.data_sources.length > 0 && <span className="normal-case"> · {server.data_sources.join(" / ")}</span>}
      </p>

      {server.tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {server.tools.map((tool) => {
            const used = calledTools.has(tool.name);
            return (
              <span
                key={tool.name}
                title={tool.description}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                  used ? accent.chip : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {tool.name}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 space-y-0.5 text-xs">
        <DomainData domain={server.domain} agent={agent} queried={queried} />
      </div>
    </div>
  );
}

function DomainData({ domain, agent, queried }: { domain: string; agent: AgentResult; queried: boolean }) {
  if (domain === "clinical") {
    const c = agent.clinical_context;
    if (!c) return <Muted>Not queried this run.</Muted>;
    return (
      <>
        <Line label="Discharge" value={c.discharge_readiness_score} />
        {c.outstanding_clinical_tasks.length > 0 && (
          <Line label="Outstanding" value={`${c.outstanding_clinical_tasks.length} task(s)`} />
        )}
        {c.medication.length > 0 && <Line label="Medication" value={`${c.medication.length} item(s)`} />}
      </>
    );
  }
  if (domain === "family") {
    const f = agent.family_context;
    if (!f) return <Muted>Not queried this run.</Muted>;
    return (
      <>
        <Line label="Consent" value={f.consent_on_file ? "On file" : "Not on file"} />
        {f.family_preferences && <Line label="Preference" value={f.family_preferences} />}
      </>
    );
  }
  // social_care
  const searches = agent.reasoning_trail.filter((s) => s.tool === "search_services").length;
  return (
    <>
      {agent.needs_profile.key_risks.length > 0 && (
        <Line label="Needs" value={`${agent.needs_profile.key_risks.length} identified`} />
      )}
      <Line label="Searches" value={`${searches} run`} />
      <Line label="Recommends" value={`${agent.recommendations.length} service(s)`} />
      {!queried && <Muted>Idle.</Muted>}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="truncate text-gray-600">
      <span className="text-gray-400">{label}: </span>
      {value}
    </p>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400">{children}</p>;
}

// Horizontal connector between the Social Care hub and a side domain. Solid when
// the domain was queried this run, dashed/faded when it's only a capability.
function Connector({ count }: { count: number }) {
  const active = count > 0;
  return (
    <div className="flex flex-row items-center justify-center gap-1 lg:flex-col">
      <svg width="40" height="16" viewBox="0 0 40 16" className={active ? "text-blue-500" : "text-gray-300"}>
        <line
          x1="2"
          y1="8"
          x2="38"
          y2="8"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={active ? undefined : "3 3"}
        />
        <path d="M4 4 1 8l3 4M36 4l3 4-3 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[10px] font-medium ${active ? "text-blue-600" : "text-gray-400"}`}>
        {active ? `${count} quer${count === 1 ? "y" : "ies"}` : "available"}
      </span>
    </div>
  );
}

// Vertical flow arrow with a caption, between the stacked layers.
function DownFlow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-gray-400">
      <span className="text-[11px]">{label}</span>
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="2" x2="8" y2="16" />
        <path d="M3 11l5 5 5-5" />
      </svg>
    </div>
  );
}
