"use client";

import { useEffect, useState } from "react";

import { listPatients } from "@/lib/api";
import type { PatientSummary } from "@/lib/types";

interface Props {
  // Runs the full pipeline for a stored patient (unlocks clinical/family context).
  onRun: (request: { patient_id: string; patient_name: string }) => void;
  disabled: boolean;
}

export default function DemoPicker({ onRun, disabled }: Props) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPatients()
      .then((list) => {
        setPatients(list);
        setSelected(list[0]?.patient_id ?? "");
      })
      .catch(() => setError("Could not load demo patients (is the backend running?)."));
  }, []);

  const chosen = patients.find((p) => p.patient_id === selected);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Run a full referral for one of the 12 synthetic patients. These records
        include clinical and family context, so the result shows the complete
        multi-domain picture.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <select
        className="rounded-md border border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-800"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={disabled || patients.length === 0}
      >
        {patients.map((patient) => (
          <option key={patient.patient_id} value={patient.patient_id}>
            {patient.name} — {patient.diagnosis_stage} {patient.dementia_type} ({patient.postcode_area})
          </option>
        ))}
      </select>
      <button
        type="button"
        className="w-fit rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        disabled={disabled || !chosen}
        onClick={() => chosen && onRun({ patient_id: chosen.patient_id, patient_name: chosen.name })}
      >
        Run referral for this patient
      </button>
    </div>
  );
}
