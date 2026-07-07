"use client";

import { useState } from "react";

import EditableField from "./EditableField";

const FIELDS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "postcode_area", label: "Postcode" },
  { key: "dementia_type", label: "Dementia Type" },
  { key: "diagnosis_stage", label: "Diagnosis Stage" },
  { key: "living_situation", label: "Living Situation" },
  { key: "carer_present", label: "Carer Present" },
  { key: "mobility", label: "Mobility" },
];

function asText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

// The editable patient summary from the mockup Report page — the coordinator can
// correct any AI-extracted detail inline before approving.
export default function EditablePatientSummary({
  patientName,
  patientData,
}: {
  patientName?: string;
  patientData?: Record<string, unknown>;
}) {
  const [data, setData] = useState<Record<string, string>>(() => ({
    name: patientName ?? "",
    age: asText(patientData?.age),
    postcode_area: asText(patientData?.postcode_area),
    dementia_type: asText(patientData?.dementia_type),
    diagnosis_stage: asText(patientData?.diagnosis_stage),
    living_situation: asText(patientData?.living_situation),
    // carer_present is a boolean from the manual form but a "Yes"/"No" string
    // when read from an uploaded document.
    carer_present:
      patientData?.carer_present === true
        ? "Yes"
        : patientData?.carer_present === false
          ? "No"
          : asText(patientData?.carer_present),
    mobility: asText(patientData?.mobility),
  }));

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient Summary</h2>
        <span className="text-xs text-gray-400">Click any field to edit</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <dt className="text-xs uppercase tracking-wide text-gray-400">{field.label}</dt>
            <dd className="mt-0.5">
              <EditableField
                value={data[field.key]}
                onSave={(value) => setData((current) => ({ ...current, [field.key]: value }))}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
