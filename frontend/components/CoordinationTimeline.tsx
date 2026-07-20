"use client";

import { useEffect, useState } from "react";

import { getInteractions } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ReassessmentRecord, StaffInteraction } from "@/lib/types";

interface Props {
  patientId: string;
  reassessments?: ReassessmentRecord[];
  carePlanVersion?: number;
}

interface Event {
  key: string;
  timestamp: string;
  kind: "intake" | "clinical" | "family" | "note" | "reassessment";
  actor: string;
  text: string;
}

const KIND_STYLE: Record<Event["kind"], { dot: string; label: string }> = {
  intake: { dot: "bg-gray-400", label: "At intake" },
  clinical: { dot: "bg-sky-500", label: "Clinical update" },
  family: { dot: "bg-violet-500", label: "Family note" },
  note: { dot: "bg-gray-400", label: "Note" },
  reassessment: { dot: "bg-amber-500", label: "Reassessment" },
};

// A plain-English story of everything that has happened on a case and what it
// triggered — the coordination made legible for social workers and families,
// with no MCP/agent/tool jargon. Built entirely from real activity data.
export default function CoordinationTimeline({ patientId, reassessments = [], carePlanVersion }: Props) {
  const [interactions, setInteractions] = useState<StaffInteraction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInteractions(patientId)
      .then((summary) => setInteractions(summary.interactions))
      .catch(() => setError("Could not load the coordination activity."));
  }, [patientId]);

  const events = buildEvents(interactions ?? [], reassessments);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Coordination activity</h2>
          <p className="mt-1 text-xs text-gray-400">
            Who shared or changed what across this case, and what it triggered.
          </p>
        </div>
        {carePlanVersion !== undefined && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Care plan v{carePlanVersion}
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {events.length > 0 ? (
        <ol className="mt-4 space-y-0">
          {events.map((event, index) => {
            const style = KIND_STYLE[event.kind];
            return (
              <li key={event.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                  {index < events.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
                </div>
                <div className="pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{event.actor}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {style.label}
                    </span>
                    {event.timestamp && (
                      <span className="text-xs text-gray-400">{formatDateTime(event.timestamp)}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{event.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        !error && (
          <p className="mt-4 text-sm text-gray-400">
            {interactions === null ? "Loading…" : "No activity recorded yet."}
          </p>
        )
      )}
    </section>
  );
}

function buildEvents(interactions: StaffInteraction[], reassessments: ReassessmentRecord[]): Event[] {
  const events: Event[] = interactions.map((item, index) => {
    const isFamily = item.actor_role === "Family/Carer";
    let kind: Event["kind"] = "note";
    if (item.channel === "intake note") kind = "intake";
    else if (item.channel === "clinical update") kind = "clinical";
    else if (isFamily) kind = "family";

    let text = item.note;
    if (kind === "clinical") text = `Reported a change — ${item.note}.`;
    else if (kind === "family") text = `Shared with the team — “${stripPrefix(item.note)}”.`;
    else if (kind === "intake") text = `Contributed at intake — “${item.note}”.`;
    else text = `Logged a note — “${item.note}”.`;

    return {
      key: item.interaction_id || `i-${index}`,
      timestamp: item.timestamp,
      kind,
      actor: friendlyActor(item.actor_role),
      text,
    };
  });

  reassessments.forEach((record, index) => {
    const outcome = record.recommend_rerun
      ? "The Social Care Agent was re-run to refresh the recommendations."
      : "The existing recommendations were confirmed to still hold.";
    events.push({
      key: `r-${record.reassessed_at}-${index}`,
      timestamp: record.reassessed_at,
      kind: "reassessment",
      actor: "Pont",
      text: `New information was reviewed — ${record.summary} ${outcome}`,
    });
  });

  return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function friendlyActor(role: string): string {
  return role === "Family/Carer" ? "Family / carer" : role;
}

function stripPrefix(note: string): string {
  const match = note.match(/^(Preference|Concern|Update|Consent):\s*(.*)$/);
  return match ? match[2] : note;
}
