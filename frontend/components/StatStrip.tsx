import type { CaseStats } from "@/lib/types";

// Team-level aggregate figures (Tier 3) -- the kind of summary a team lead or
// commissioner would want at a glance.
export default function StatStrip({ stats }: { stats: CaseStats }) {
  const cards: { label: string; value: number; accent: string }[] = [
    { label: "Total cases", value: stats.total_cases, accent: "text-gray-900" },
    { label: "Pending review", value: stats.pending_review, accent: "text-amber-600" },
    { label: "Approved", value: stats.approved, accent: "text-green-600" },
    { label: "Assessed this month", value: stats.assessed_this_month, accent: "text-blue-600" },
    { label: "Discrepancies this week", value: stats.discrepancies_this_week, accent: "text-red-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-gray-200 p-4">
          <div className={`text-3xl font-bold ${card.accent}`}>{card.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
