"use client";

import { useState } from "react";

import { ApiError, addClinicalUpdate } from "@/lib/api";

// Fields a ward/OT/consultant would report. "mobility"/"medication" etc. are the
// ones the reassessment treats as material to discharge planning.
const FIELDS = ["mobility", "medication", "discharge_readiness_score", "ward observation"];
const CLINICAL_SOURCES = ["Ward Nurse", "OT", "Consultant"];

interface Props {
  patientId: string;
  // The role logging the update; used as the clinical-update source.
  defaultSource?: string;
  // Allow the person to change who the update is attributed to.
  sourceSelectable?: boolean;
  onAdded?: () => void;
}

// A first-class "log a clinical update" form used by the clinical portal and the
// social worker's referral view. An update is written to the patient's clinical
// record and, being newer than the last review, prompts a reassessment.
export default function LogUpdateForm({
  patientId,
  defaultSource = "Ward Nurse",
  sourceSelectable = false,
  onAdded,
}: Props) {
  const [field, setField] = useState(FIELDS[0]);
  const [value, setValue] = useState("");
  const [source, setSource] = useState(defaultSource);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addClinicalUpdate(patientId, { field_changed: field, new_value: value.trim(), source });
      setValue("");
      setDone(true);
      onAdded?.();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send the update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={field}
          onChange={(event) => setField(event.target.value)}
          className={INPUT}
          aria-label="What changed"
        >
          {FIELDS.map((option) => (
            <option key={option} value={option}>{labelFor(option)}</option>
          ))}
        </select>
        <input
          value={value}
          onChange={(event) => { setValue(event.target.value); setDone(false); }}
          placeholder="What changed? e.g. now needs a walking frame, unsteady"
          className={`${INPUT} sm:col-span-2`}
        />
        {sourceSelectable && (
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={INPUT}
            aria-label="Logged by"
          >
            {CLINICAL_SOURCES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
        <button
          onClick={submit}
          disabled={busy || !value.trim()}
          className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 ${
            sourceSelectable ? "sm:col-span-2" : "sm:col-span-3"
          }`}
        >
          {busy ? "Sending…" : "Send update to the social care team"}
        </button>
      </div>
      {done && (
        <p className="mt-2 text-sm text-green-700">
          ✓ Sent to the social care team — a reassessment has been recommended.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function labelFor(field: string): string {
  if (field === "discharge_readiness_score") return "discharge readiness";
  return field;
}

const INPUT = "rounded-md border border-gray-300 bg-white p-2.5 text-sm";
