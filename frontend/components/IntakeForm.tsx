"use client";

import { useState } from "react";

import type { RunAgentRequest } from "@/lib/api";
import type { SourceNoteInput } from "@/lib/types";

interface Props {
  onRun: (request: RunAgentRequest) => void;
  disabled: boolean;
}

const STAGES = ["", "mild", "moderate", "severe"];
const MOBILITY = ["", "independent", "uses walking aid", "wheelchair user"];
const CARER = [
  { label: "Unknown", value: "" },
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

// Sensible default sources so a user can demonstrate discrepancy detection quickly.
const DEFAULT_NOTES: SourceNoteInput[] = [
  { source: "Family/Carer", text: "" },
  { source: "Ward Nursing Record", text: "" },
];

export default function IntakeForm({ onRun, disabled }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<SourceNoteInput[]>(DEFAULT_NOTES);

  const set = (key: string, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const updateNote = (index: number, key: keyof SourceNoteInput, value: string) =>
    setNotes((current) =>
      current.map((note, i) => (i === index ? { ...note, [key]: value } : note)),
    );

  function submit() {
    onRun({
      patient_name: fields.name || undefined,
      patient_data: buildPatientData(fields),
      source_notes: notes.filter((note) => note.text.trim()),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter what is known about the patient. Add accounts from different sources
        below — Pont flags where they disagree.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Patient name (optional)">
          <input className={inputClass} value={fields.name ?? ""}
            onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Age">
          <input type="number" className={inputClass} value={fields.age ?? ""}
            onChange={(e) => set("age", e.target.value)} />
        </Field>
        <Field label="Postcode area">
          <input className={inputClass} placeholder="e.g. CF14" value={fields.postcode_area ?? ""}
            onChange={(e) => set("postcode_area", e.target.value)} />
        </Field>
        <Field label="Dementia type">
          <input className={inputClass} placeholder="e.g. Alzheimer's disease"
            value={fields.dementia_type ?? ""} onChange={(e) => set("dementia_type", e.target.value)} />
        </Field>
        <Field label="Diagnosis stage">
          <select className={inputClass} value={fields.diagnosis_stage ?? ""}
            onChange={(e) => set("diagnosis_stage", e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s || "Select…"}</option>)}
          </select>
        </Field>
        <Field label="Mobility">
          <select className={inputClass} value={fields.mobility ?? ""}
            onChange={(e) => set("mobility", e.target.value)}>
            {MOBILITY.map((m) => <option key={m} value={m}>{m || "Select…"}</option>)}
          </select>
        </Field>
        <Field label="Living situation">
          <input className={inputClass} placeholder="e.g. lives alone"
            value={fields.living_situation ?? ""} onChange={(e) => set("living_situation", e.target.value)} />
        </Field>
        <Field label="Carer present?">
          <select className={inputClass} value={fields.carer_present ?? ""}
            onChange={(e) => set("carer_present", e.target.value)}>
            {CARER.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Cognitive notes">
        <textarea className={inputClass} rows={2} value={fields.cognitive_notes ?? ""}
          onChange={(e) => set("cognitive_notes", e.target.value)} />
      </Field>
      <Field label="Current support">
        <input className={inputClass} placeholder="e.g. none, weekly home visit"
          value={fields.current_support ?? ""} onChange={(e) => set("current_support", e.target.value)} />
      </Field>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Source notes</span>
        {notes.map((note, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr]">
            <input className={inputClass} value={note.source}
              onChange={(e) => updateNote(index, "source", e.target.value)} />
            <textarea className={inputClass} rows={2} placeholder="What this source reports…"
              value={note.text} onChange={(e) => updateNote(index, "text", e.target.value)} />
          </div>
        ))}
        <button type="button" className="w-fit text-sm text-blue-600 hover:underline"
          onClick={() => setNotes((c) => [...c, { source: "", text: "" }])}>
          + Add another source
        </button>
      </div>

      <button type="button" disabled={disabled}
        className="w-fit rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        onClick={submit}>
        Run referral
      </button>
    </div>
  );
}

const inputClass =
  "rounded-md border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-600 dark:bg-gray-800";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      {children}
    </label>
  );
}

function buildPatientData(fields: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (fields.age) data.age = Number(fields.age);
  for (const key of ["postcode_area", "dementia_type", "diagnosis_stage",
    "living_situation", "mobility", "cognitive_notes", "current_support"]) {
    if (fields[key]) data[key] = fields[key];
  }
  if (fields.carer_present) data.carer_present = fields.carer_present === "yes";
  return data;
}
