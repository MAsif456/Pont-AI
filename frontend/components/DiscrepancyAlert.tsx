import type { Discrepancy } from "@/lib/types";

// Source disagreements are a high-value signal for the reviewing social worker, so
// they are rendered prominently near the top of the results rather than buried.
export default function DiscrepancyAlert({ discrepancies }: { discrepancies: Discrepancy[] }) {
  if (discrepancies.length === 0) {
    return null;
  }
  return (
    <section className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/40">
      <h2 className="flex items-center gap-2 text-base font-semibold text-amber-900 dark:text-amber-200">
        ⚠ Source discrepancies detected ({discrepancies.length})
      </h2>
      <ul className="mt-2 space-y-2">
        {discrepancies.map((discrepancy, index) => (
          <li key={index} className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">{discrepancy.sources.join(" vs ")}:</span>{" "}
            {discrepancy.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
