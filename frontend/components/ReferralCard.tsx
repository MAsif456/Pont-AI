import ServiceContact from "@/components/ServiceContact";
import type { Confidence, Recommendation } from "@/lib/types";

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low — human review recommended",
};

// One recommended service, rendered as a numbered row for the report list. The
// parent supplies the dividing lines, so this row carries no border of its own.
export default function ReferralCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <span className="text-sm font-medium text-gray-300">{recommendation.rank}.</span>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-800">{recommendation.name}</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {recommendation.category}
            </span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${CONFIDENCE_STYLE[recommendation.confidence]}`}>
          {CONFIDENCE_LABEL[recommendation.confidence]}
        </span>
      </div>
      <div className="mt-2 pl-6">
        <p className="text-sm text-gray-600">{recommendation.justification}</p>
        <ServiceContact phone={recommendation.phone} address={recommendation.address} />
      </div>
    </article>
  );
}
