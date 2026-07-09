import type { ClinicalContext, FamilyContext } from "@/lib/types";

interface Props {
  clinical: ClinicalContext | null;
  family: FamilyContext | null;
}

// Surfaces the Clinical and Family domain records the agent queried, labelled by
// domain to make the multi-agent architecture visible even though only the Social
// Care Agent reasons autonomously in this build.
export default function RelatedContextPanel({ clinical, family }: Props) {
  if (!clinical && !family) {
    return null;
  }
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Related context</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {clinical && (
          <DomainCard title="Clinical Context">
            <Line label="Diagnosis" value={clinical.diagnosis_summary} />
            <Line label="Discharge readiness" value={clinical.discharge_readiness_score} />
            <ListLine label="Medication" items={clinical.medication} />
            <ListLine label="Outstanding tasks" items={clinical.outstanding_clinical_tasks} />
          </DomainCard>
        )}
        {family && (
          <DomainCard title="Family Context">
            <Line label="Preferences" value={family.family_preferences} />
            <Line label="Consent on file" value={family.consent_on_file ? "Yes" : "No"} />
            <Line label="Transport" value={family.transport_notes} />
          </DomainCard>
        )}
      </div>
    </section>
  );
}

function DomainCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <dl className="mt-2 space-y-1.5">{children}</dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function ListLine({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return <Line label={label} value={items.join("; ")} />;
}
