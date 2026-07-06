"use client";

import { useState } from "react";

import { ApiError, createReferral } from "@/lib/api";
import { REFERRAL_SOURCE_LABEL } from "@/lib/format";
import type { ReferralSource } from "@/lib/types";

const SOURCES: ReferralSource[] = [
  "ward_nursing",
  "ot",
  "discharge_liaison",
  "community_social_worker",
  "self_family",
];

// Logs a new incoming referral (POST /referrals). Kept as a modal so it can be
// opened from the board's "Log New Referral" button.
export default function NewReferralModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState<ReferralSource>("ward_nursing");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !reason.trim()) {
      setError("Patient name and reason are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createReferral({ patient_name: name.trim(), source, reason_for_referral: reason.trim() });
      onCreated();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not log the referral.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log new referral</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Patient name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Referral source">
            <select value={source} onChange={(e) => setSource(e.target.value as ReferralSource)} className={inputClass}>
              {SOURCES.map((value) => (
                <option key={value} value={value}>{REFERRAL_SOURCE_LABEL[value]}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason for referral">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputClass} />
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Logging…" : "Log referral"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
