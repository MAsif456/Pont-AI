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
    <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <h2 className="text-lg font-semibold">Related context</h2>
      <p className="mt-1 text-xs text-gray-400">
        Queried from other domains in the multi-agent architecture.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {clinical && (
          <DomainCard title="Clinical domain" accent="text-sky-600">
            <Line label="Diagnosis" value={clinical.diagnosis_summary} />
            <Line label="Discharge readiness" value={clinical.discharge_readiness_score} />
            <ListLine label="Medication" items={clinical.medication} />
            <ListLine label="Outstanding tasks" items={clinical.outstanding_clinical_tasks} />
          </DomainCard>
        )}
        {family && (
          <DomainCard title="Family domain" accent="text-violet-600">
            <Line label="Preferences" value={family.family_preferences} />
            <Line label="Consent on file" value={family.consent_on_file ? "Yes" : "No"} />
            <Line label="Transport" value={family.transport_notes} />
          </DomainCard>
        )}
      </div>
    </section>
  );
}

function DomainCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800/60">
      <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
      <dl className="mt-2 space-y-1.5">{children}</dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  );
}

function ListLine({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return <Line label={label} value={items.join("; ")} />;
}
