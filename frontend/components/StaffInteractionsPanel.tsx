"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, getInteractions, logInteraction } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { InteractionSummary } from "@/lib/types";

// Roles any actor can attribute an interaction to (no login required).
const ACTOR_ROLES = [
  "Ward Nurse",
  "OT",
  "Consultant",
  "GP",
  "Social Worker",
  "Discharge Liaison",
  "Family/Carer",
];

const CHANNEL_LABEL: Record<string, string> = {
  logged: "logged",
  "intake note": "intake",
  "clinical update": "clinical",
};

// Quantifies how much each actor has been involved with a patient (the "value"
// story), and lets any actor log a role-attributed interaction.
export default function StaffInteractionsPanel({ patientId }: { patientId: string }) {
  const [summary, setSummary] = useState<InteractionSummary | null>(null);
  const [role, setRole] = useState(ACTOR_ROLES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSummary(await getInteractions(patientId));
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => setError("Could not load staff interactions."));
  }, [refresh]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await logInteraction(patientId, role, note.trim());
      setNote("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not log the interaction.");
    } finally {
      setBusy(false);
    }
  }

  const maxCount = Math.max(1, ...(summary?.by_actor.map((a) => a.count) ?? [1]));

  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Staff interactions</h2>
        {summary && (
          <span className="text-sm text-gray-500">{summary.total} total across the workflow</span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Counts every touchpoint — logged interactions, intake notes and clinical updates.
      </p>

      {summary && summary.by_actor.length > 0 && (
        <div className="mt-4 space-y-2">
          {summary.by_actor.map((actor) => (
            <div key={actor.role} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-gray-700">{actor.role}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${(actor.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-medium text-gray-800">
                ×{actor.count}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto]">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        >
          {ACTOR_ROLES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What happened? (optional)"
          className="rounded-md border border-gray-300 bg-white p-2.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Logging…" : "Log interaction"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {summary && summary.interactions.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600">
            Interaction timeline ({summary.interactions.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {summary.interactions.map((interaction) => (
              <li
                key={interaction.interaction_id}
                className="flex items-start justify-between gap-3 border-l-2 border-gray-100 pl-3 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800">{interaction.actor_role}</span>
                  <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-gray-500">
                    {CHANNEL_LABEL[interaction.channel] ?? interaction.channel}
                  </span>
                  {interaction.note && (
                    <p className="text-gray-600">{interaction.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {interaction.timestamp ? timeAgo(interaction.timestamp) : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
