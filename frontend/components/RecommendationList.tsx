import type { Recommendation } from "@/lib/types";
import ReferralCard from "./ReferralCard";

export default function RecommendationList({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        Ranked referral recommendations
        {recommendations.length === 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">— none identified</span>
        )}
      </h2>
      <div className="flex flex-col gap-3">
        {recommendations.map((recommendation) => (
          <ReferralCard key={recommendation.service_id} recommendation={recommendation} />
        ))}
      </div>
    </section>
  );
}
