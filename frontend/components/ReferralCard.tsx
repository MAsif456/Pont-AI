import type { Confidence, Recommendation } from "@/lib/types";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  low: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function ReferralCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <article className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {recommendation.rank}. {recommendation.name}
          </h3>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {recommendation.category}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${CONFIDENCE_STYLE[recommendation.confidence]}`}>
          {recommendation.confidence} confidence
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {recommendation.justification}
      </p>
      {recommendation.recommended_for_human_review && (
        <p className="mt-2 text-xs font-medium text-red-600">
          ⚑ Recommended for human review
        </p>
      )}
    </article>
  );
}
