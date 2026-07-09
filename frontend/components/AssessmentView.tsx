import type { StoredAssessment } from "@/lib/types";
import DiscrepancyAlert from "./DiscrepancyAlert";
import NeedsProfileView from "./NeedsProfileView";
import ReasoningTrail from "./ReasoningTrail";
import RecommendationList from "./RecommendationList";
import RelatedContextPanel from "./RelatedContextPanel";
import ReportView from "./ReportView";

// Renders one assessment in full -- the same layout as the results page, reused
// so the history view and the live result stay consistent.
export default function AssessmentView({ assessment }: { assessment: StoredAssessment }) {
  const result = assessment.agent_result;
  return (
    <div className="flex flex-col gap-6">
      <NeedsProfileView profile={result.needs_profile} />
      <DiscrepancyAlert discrepancies={result.discrepancies} />
      <RelatedContextPanel clinical={result.clinical_context} family={result.family_context} />
      <RecommendationList recommendations={result.recommendations} />
      <ReportView report={assessment.report} />
      <ReasoningTrail steps={result.reasoning_trail} toolCalls={result.tool_calls_used} />
    </div>
  );
}
