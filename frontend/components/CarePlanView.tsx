import type { CarePlan } from "@/lib/types";
import RecommendationList from "./RecommendationList";

// The orchestration layer's headline output: one plan reconciled across the
// clinical, social-care and family domains. Reuses the recommendation list and
// the muted/warning styling established elsewhere for consistency.
export default function CarePlanView({ plan }: { plan: CarePlan }) {
  const delayed = /delay|not yet|not advised/i.test(plan.discharge_recommendation);
  return (
    <section className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-blue-900">Dynamic care plan</h2>
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          v{plan.version}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Reconciled across the clinical, social care and family domains.
      </p>

      <div
        className={`mt-4 rounded-lg border-l-4 p-4 ${
          delayed ? "border-amber-500 bg-amber-50" : "border-green-500 bg-green-50"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Discharge recommendation
        </p>
        <p className="mt-1 font-medium text-gray-800">{plan.discharge_recommendation}</p>
      </div>

      <p className="mt-4 text-sm text-gray-700">{plan.summary}</p>

      {plan.cross_domain_flags.length > 0 && (
        <div className="mt-4 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold text-amber-900">Cross-domain flags</h3>
          <ul className="mt-1 space-y-1 text-sm text-amber-900">
            {plan.cross_domain_flags.map((flag, index) => (
              <li key={index}>
                ⚠ {flag.description}
                {flag.domains.length > 0 && (
                  <span className="ml-1 text-xs text-amber-700">({flag.domains.join(" · ")})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <RecommendationList recommendations={plan.recommended_services} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DomainColumn title="Clinical considerations" items={plan.clinical_considerations} accent="text-sky-700" />
        <DomainColumn title="Family considerations" items={plan.family_considerations} accent="text-violet-700" />
      </div>

      <p className="mt-5 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        {plan.human_review_statement}
      </p>
    </section>
  );
}

function DomainColumn({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-md bg-white p-4">
      <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
