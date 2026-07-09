import type { Discrepancy } from "@/lib/types";

// Source disagreements are a high-value signal for the reviewing social worker, so
// they are rendered prominently near the top of the results rather than buried.
export default function DiscrepancyAlert({ discrepancies }: { discrepancies: Discrepancy[] }) {
  if (discrepancies.length === 0) {
    return null;
  }
  return (
    <section className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {discrepancies.length === 1 ? "Discrepancy detected" : `${discrepancies.length} discrepancies detected`}
      </h2>
      <ul className="mt-2 space-y-2">
        {discrepancies.map((discrepancy, index) => (
          <li key={index} className="text-sm text-amber-900">
            <span className="font-medium">{discrepancy.sources.join(" vs ")}:</span>{" "}
            {discrepancy.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
