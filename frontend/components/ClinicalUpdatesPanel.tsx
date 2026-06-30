"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  addClinicalUpdate,
  getClinicalContext,
  reassessReferral,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ClinicalUpdate, Referral } from "@/lib/types";

// Clinical updates originate from the hospital side, so only clinical roles.
const CLINICAL_ROLES = ["Ward Nurse", "Consultant", "OT"];
const COMMON_FIELDS = ["medication", "mobility", "discharge_readiness_score", "ward observation"];

interface Props {
  referral: Referral;
  onReviewed: () => void; // refresh the referral after a reassessment
  onRerun: () => void; // trigger the full agent re-run
}

export default function ClinicalUpdatesPanel({ referral, onReviewed, onRerun }: Props) {
  const patientId = referral.patient_id;
  const [updates, setUpdates] = useState<ClinicalUpdate[]>([]);
  const [busy, setBusy] = useState(false);
  const [noChange, setNoChange] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!patientId) return;
    const context = await getClinicalContext(patientId);
    setUpdates(context.clinical_updates);
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => setError("Could not load clinical updates."));
  }, [refresh]);

  if (!patientId) return null;

  const reviewedAt = referral.clinical_reviewed_at;
  const unreviewed = updates.filter((u) => !reviewedAt || u.timestamp > reviewedAt);
  const latestImpact = referral.reassessments.at(-1) ?? null;
  // Offer a full re-run only when the latest impact asked for one and none has
  // happened since (a re-run advances clinical_reviewed_at past the reassessment).
  const canRerun =
    latestImpact?.recommend_rerun === true &&
    referral.clinical_reviewed_at === latestImpact.reassessed_at;

  async function checkImpact() {
    setBusy(true);
    setError(null);
    setNoChange(false);
    try {
      const result = await reassessReferral(referral.referral_id);
      if (!result.changed) setNoChange(true);
      onReviewed();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Reassessment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-sky-50/40 p-5">
      <h2 className="text-lg font-semibold text-sky-800">Clinical updates</h2>
      <p className="mt-1 text-xs text-gray-500">
        Incoming from the hospital system (Clinical domain) — separate from the social care notes above.
      </p>

      {unreviewed.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-amber-500 bg-amber-50 p-3">
          <span className="text-sm font-medium text-amber-900">
            ⚠ {unreviewed.length} new clinical update{unreviewed.length === 1 ? "" : "s"} — check impact on discharge
          </span>
          <button
            onClick={checkImpact}
            disabled={busy}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check impact"}
          </button>
        </div>
      )}
      {noChange && <p className="mt-3 text-sm text-gray-500">No new updates since the last review.</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <Timeline updates={updates} reviewedAt={reviewedAt} />

      {latestImpact && (
        <ImpactSummary impact={latestImpact} canRerun={canRerun} onRerun={onRerun} />
      )}

      <SimulateForm patientId={patientId} onAdded={refresh} />
    </section>
  );
}

function Timeline({ updates, reviewedAt }: { updates: ClinicalUpdate[]; reviewedAt: string | null }) {
  if (updates.length === 0) {
    return <p className="mt-4 text-sm text-gray-400">No clinical updates recorded.</p>;
  }
  return (
    <ol className="mt-4 space-y-2">
      {[...updates].reverse().map((update) => {
        const isNew = !reviewedAt || update.timestamp > reviewedAt;
        return (
          <li
            key={update.update_id}
            className="rounded-md border border-gray-200 bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800">{update.field_changed}</span>
              <span className="text-xs text-gray-400">{formatDateTime(update.timestamp)}</span>
            </div>
            <p className="mt-0.5 text-gray-600">
              {update.previous_value && (
                <span className="text-gray-400 line-through">{update.previous_value} </span>
              )}
              → {update.new_value}
            </p>
            <p className="mt-1 text-xs text-sky-700">
              {update.source}
              {isNew && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-800">new</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ImpactSummary({
  impact,
  canRerun,
  onRerun,
}: {
  impact: Referral["reassessments"][number];
  canRerun: boolean;
  onRerun: () => void;
}) {
  const warn = impact.affects_discharge;
  return (
    <div
      className={`mt-4 rounded-lg border-l-4 p-4 ${
        warn ? "border-amber-500 bg-amber-50" : "border-gray-300 bg-gray-50"
      }`}
    >
      <h3 className="text-sm font-semibold text-gray-800">Impact assessment</h3>
      <p className="mt-1 text-sm text-gray-700">{impact.summary}</p>
      <p className="mt-2 text-sm text-gray-700">
        <span className="font-medium">Discharge: </span>
        {impact.discharge_impact}
      </p>
      <p className="mt-1 text-sm text-gray-600">{impact.recommendation_note}</p>
      {canRerun && (
        <button
          onClick={onRerun}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Run full reassessment
        </button>
      )}
    </div>
  );
}

function SimulateForm({ patientId, onAdded }: { patientId: string; onAdded: () => void }) {
  const [field, setField] = useState(COMMON_FIELDS[0]);
  const [value, setValue] = useState("");
  const [source, setSource] = useState(CLINICAL_ROLES[0]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await addClinicalUpdate(patientId, { field_changed: field, new_value: value, source });
      setValue("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-5 rounded-md border border-dashed border-gray-300 p-3">
      <summary className="cursor-pointer text-sm font-medium text-gray-600">
        Simulate incoming clinical update
      </summary>
      <p className="mt-2 text-xs text-gray-400">
        Stands in for data a hospital system would push automatically.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={field} onChange={(e) => setField(e.target.value)} className={inputClass}>
          {COMMON_FIELDS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New value (e.g. now twice daily)"
          className={`${inputClass} sm:col-span-2`}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
          {CLINICAL_ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={busy || !value.trim()}
          className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 sm:col-span-2"
        >
          {busy ? "Adding…" : "Add clinical update"}
        </button>
      </div>
    </details>
  );
}

const inputClass = "rounded-md border border-gray-300 bg-white p-2.5 text-sm";
