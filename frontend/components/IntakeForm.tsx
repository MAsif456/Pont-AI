"use client";

import { useState } from "react";

import type { RunAgentRequest } from "@/lib/api";
import type { SourceNoteInput } from "@/lib/types";

interface Props {
  onRun: (request: RunAgentRequest) => void;
  disabled: boolean;
}

const DEMENTIA_TYPES = [
  "Alzheimer's disease", "Vascular dementia", "Lewy body dementia",
  "Frontotemporal dementia", "Mixed dementia",
];
const LIVING = ["Lives alone", "Lives with spouse", "Lives with family"];
const MOBILITY = ["Walks unaided", "Uses walking aid", "Wheelchair user"];
const STAGES = ["mild", "moderate", "severe"];
const RISK_FLAGS = [
  "Wandering risk", "Falls risk", "Safeguarding concern", "Medication risk",
  "Social isolation", "Carer stress", "Self-neglect",
];
const NOTE_SOURCES = [
  "Family/Carer", "Ward Nursing Record", "Social Worker Observation", "GP", "OT",
];

const DEFAULT_NOTES: SourceNoteInput[] = [
  { source: "Family/Carer", text: "" },
  { source: "Ward Nursing Record", text: "" },
];

export default function IntakeForm({ onRun, disabled }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stage, setStage] = useState("");
  const [carer, setCarer] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [notes, setNotes] = useState<SourceNoteInput[]>(DEFAULT_NOTES);

  const set = (key: string, value: string) => setFields((c) => ({ ...c, [key]: value }));
  const toggleRisk = (risk: string) =>
    setRisks((c) => (c.includes(risk) ? c.filter((r) => r !== risk) : [...c, risk]));
  const updateNote = (index: number, key: keyof SourceNoteInput, value: string) =>
    setNotes((c) => c.map((note, i) => (i === index ? { ...note, [key]: value } : note)));

  function submit() {
    const cognitive = [fields.cognitive_notes, risks.length ? `Flagged risks: ${risks.join(", ")}.` : ""]
      .filter(Boolean)
      .join(" ");
    const patient_data: Record<string, unknown> = { carer_present: carer };
    if (fields.age) patient_data.age = Number(fields.age);
    if (stage) patient_data.diagnosis_stage = stage;
    for (const key of ["postcode_area", "dementia_type", "living_situation", "mobility", "current_support"]) {
      if (fields[key]) patient_data[key] = fields[key];
    }
    if (cognitive) patient_data.cognitive_notes = cognitive;
    onRun({
      patient_name: fields.name || undefined,
      patient_data,
      source_notes: notes.filter((note) => note.text.trim()),
    });
  }

  return (
    <div className="space-y-5">
      <Card title="Patient Details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Patient Name">
            <input className={inputClass} value={fields.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Age">
            <input type="number" className={inputClass} value={fields.age ?? ""} onChange={(e) => set("age", e.target.value)} />
          </Field>
          <Field label="Postcode Area">
            <input className={inputClass} placeholder="e.g. CF14" value={fields.postcode_area ?? ""} onChange={(e) => set("postcode_area", e.target.value)} />
          </Field>
          <Field label="Dementia Type">
            <select className={inputClass} value={fields.dementia_type ?? ""} onChange={(e) => set("dementia_type", e.target.value)}>
              <option value="">Select…</option>
              {DEMENTIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Label>Diagnosis Stage</Label>
          <div className="mt-1 inline-flex rounded-md border border-gray-200 p-1">
            {STAGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStage(option)}
                className={`rounded px-4 py-1.5 text-sm font-medium capitalize transition ${
                  stage === option ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Living Situation">
            <select className={inputClass} value={fields.living_situation ?? ""} onChange={(e) => set("living_situation", e.target.value)}>
              <option value="">Select…</option>
              {LIVING.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Mobility">
            <select className={inputClass} value={fields.mobility ?? ""} onChange={(e) => set("mobility", e.target.value)}>
              <option value="">Select…</option>
              {MOBILITY.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <Label>Carer Present</Label>
            <p className="text-xs text-gray-400">Does the patient have an informal carer?</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={carer}
            onClick={() => setCarer((c) => !c)}
            className={`relative h-6 w-11 rounded-full transition ${carer ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${carer ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </Card>

      <Card title="Clinical & Care Notes">
        <Field label="Current Support">
          <textarea className={inputClass} rows={2} value={fields.current_support ?? ""} onChange={(e) => set("current_support", e.target.value)} />
        </Field>
        <div className="mt-4">
          <Field label="Cognitive Notes">
            <textarea className={inputClass} rows={3} value={fields.cognitive_notes ?? ""} onChange={(e) => set("cognitive_notes", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Label>Risk Flags</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {RISK_FLAGS.map((risk) => {
              const on = risks.includes(risk);
              return (
                <button
                  key={risk}
                  type="button"
                  onClick={() => toggleRisk(risk)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    on ? "border-red-300 bg-red-50 text-red-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {risk}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card title="Additional Source Notes" subtitle="Optional — notes from other sources improve recommendation quality.">
        {notes.map((note, index) => (
          <div key={index} className="mt-3 rounded-md border border-gray-200 p-3">
            <select className={`${inputClass} mb-2 w-48`} value={note.source} onChange={(e) => updateNote(index, "source", e.target.value)}>
              {NOTE_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            <textarea className={inputClass} rows={2} placeholder="Add notes from this source…" value={note.text} onChange={(e) => updateNote(index, "text", e.target.value)} />
          </div>
        ))}
        <button type="button" className="mt-3 text-sm font-medium text-blue-600 hover:underline" onClick={() => setNotes((c) => [...c, { source: NOTE_SOURCES[0], text: "" }])}>
          + Add another source
        </button>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Run Social Care Agent
        </button>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-md border border-gray-300 bg-white p-2.5 text-sm";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-gray-700">{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
