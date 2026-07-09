import type { Recommendation } from "@/lib/types";
import ReferralCard from "./ReferralCard";

export default function RecommendationList({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Recommended services
        {recommendations.length === 0 && (
          <span className="ml-2 font-normal normal-case text-gray-400">— none identified</span>
        )}
      </h2>
      <div className="mt-4 flex flex-col divide-y divide-gray-100">
        {recommendations.map((recommendation) => (
          <ReferralCard key={recommendation.service_id} recommendation={recommendation} />
        ))}
      </div>
    </section>
  );
}
