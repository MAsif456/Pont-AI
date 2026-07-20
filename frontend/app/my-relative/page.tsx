"use client";

import { useCallback, useEffect, useState } from "react";

import { ReferralStatusBadge } from "@/components/Badges";
import RoleGuard from "@/components/RoleGuard";
import { useRole } from "@/components/RoleProvider";
import {
  ApiError,
  getFamilyContext,
  getInteractions,
  listReferrals,
  logInteraction,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { FamilyContext, Referral, StaffInteraction } from "@/lib/types";

const NOTE_TYPES = ["Preference", "Concern", "Update", "Consent"] as const;
type NoteType = (typeof NOTE_TYPES)[number];

export default function MyRelativePage() {
  return (
    <RoleGuard allow={["family", "social_worker"]}>
      <MyRelative />
    </RoleGuard>
  );
}

function MyRelative() {
  const { meta } = useRole();
  const patientId = meta.boundPatientId ?? "PT-001";
  const patientName = meta.boundPatientName ?? "your relative";
  const firstName = patientName.split(" ")[0];

  const [referral, setReferral] = useState<Referral | null>(null);
  const [family, setFamily] = useState<FamilyContext | null>(null);
  const [notes, setNotes] = useState<StaffInteraction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const summary = await getInteractions(patientId);
    setNotes(summary.interactions.filter((item) => item.actor_role === "Family/Carer"));
  }, [patientId]);

  useEffect(() => {
    listReferrals()
      .then((list) => setReferral(list.find((r) => r.patient_id === patientId) ?? null))
      .catch(() => setError("Could not load the referral (is the backend running?)."));
    getFamilyContext(patientId).then(setFamily).catch(() => {});
    // loadNotes setStates only after an async fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotes().catch(() => {});
  }, [patientId, loadNotes]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
        Family Portal
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{firstName}&apos;s Care</h1>
      <p className="mt-1 text-sm text-gray-500">
        Logged in as {meta.subLabel}. You can share updates and preferences with the social care
        team directly through Pont.
      </p>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Referral status */}
      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current referral status</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Row label="Patient" value={patientName} />
          <Row label="Assigned social worker" value={referral?.assigned_worker ?? "Cardiff Social Services"} />
          <div className="flex items-center gap-2">
            <dt className="text-sm text-gray-400">Status:</dt>
            {referral ? <ReferralStatusBadge status={referral.status} /> : <span className="text-sm text-gray-400">—</span>}
          </div>
        </dl>
        {family && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Fact label="Care preference" value={family.family_preferences || "Not recorded"} />
            <Fact label="Consent" value={family.consent_on_file ? "Confirmed" : "Not on file"} />
            <Fact label="Transport" value={family.transport_notes || "Not recorded"} />
          </div>
        )}
      </section>

      <AddNote patientId={patientId} onSent={loadNotes} />

      {/* Previous notes */}
      {notes.length > 0 && (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your previous notes</h2>
          <ul className="mt-3 space-y-3">
            {notes.map((note) => (
              <li key={note.interaction_id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <NoteTypeChip note={note.note} />
                  <span className="text-xs text-gray-400">{note.timestamp ? formatDateTime(note.timestamp) : ""}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{stripType(note.note)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-4 rounded-md bg-violet-50 p-3 text-xs text-violet-800">
        Your notes are shared securely with the social care team and stored as part of {firstName}&apos;s
        referral. A note about a change at home can prompt the team to reassess the care plan.
      </p>
    </main>
  );
}

function AddNote({ patientId, onSent }: { patientId: string; onSent: () => Promise<void> }) {
  const [type, setType] = useState<NoteType>("Update");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await logInteraction(patientId, "Family/Carer", `${type}: ${text.trim()}`);
      setText("");
      await onSent();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add a note for the social care team</h2>
      <p className="mt-1 text-xs text-gray-400">
        Share a preference, a concern, an update from home, or confirm consent.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {NOTE_TYPES.map((option) => (
          <button
            key={option}
            onClick={() => setType(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              type === option
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        placeholder="e.g. Mum had a fall last week and can no longer manage the stairs."
        className="mt-3 w-full rounded-md border border-gray-300 p-3 text-sm"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-md bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send note"}
        </button>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function noteType(note: string): string | null {
  const match = NOTE_TYPES.find((type) => note.startsWith(`${type}:`));
  return match ?? null;
}

function stripType(note: string): string {
  const type = noteType(note);
  return type ? note.slice(type.length + 1).trim() : note;
}

function NoteTypeChip({ note }: { note: string }) {
  const type = noteType(note);
  if (!type) return null;
  return (
    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
      {type}
    </span>
  );
}
