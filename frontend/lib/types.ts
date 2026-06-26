// TypeScript mirrors of the backend response models. Kept in sync by hand because
// the prototype has a small, stable API surface and no codegen step.

export type Confidence = "high" | "medium" | "low";

export interface NeedsProfile {
  dementia_stage: string;
  mobility_needs: string;
  living_situation: string;
  carer_status: string;
  key_risks: string[];
  summary: string;
}

export interface Discrepancy {
  sources: string[];
  description: string;
}

export interface ClinicalContext {
  patient_id: string;
  diagnosis_summary: string;
  medication: string[];
  discharge_readiness_score: string;
  outstanding_clinical_tasks: string[];
}

export interface FamilyContext {
  patient_id: string;
  family_preferences: string;
  consent_on_file: boolean;
  transport_notes: string;
}

export interface Recommendation {
  service_id: string;
  name: string;
  category: string;
  rank: number;
  justification: string;
  confidence: Confidence;
  recommended_for_human_review: boolean;
}

export interface ReasoningStep {
  step: number;
  tool: string;
  tool_input: string;
  summary: string;
  reasoning: string;
}

export interface AgentResult {
  patient_id: string | null;
  needs_profile: NeedsProfile;
  discrepancies: Discrepancy[];
  clinical_context: ClinicalContext | null;
  family_context: FamilyContext | null;
  recommendations: Recommendation[];
  reasoning_trail: ReasoningStep[];
  tool_calls_used: number;
}

export interface ReferralReport {
  patient_summary: string;
  identified_needs: string[];
  discrepancies: Discrepancy[];
  recommended_services: Recommendation[];
  flagged_risks: string[];
  clinical_context_referenced: string;
  family_context_referenced: string;
  human_review_statement: string;
  text_version: string;
}

export interface PatientSummary {
  patient_id: string;
  name: string;
  age: number | null;
  postcode_area: string;
  dementia_type: string;
  diagnosis_stage: string;
}

export interface SourceNoteInput {
  source: string;
  text: string;
}

// The combined result the results page renders.
export interface PipelineResult {
  agent: AgentResult;
  report: ReferralReport;
  patientName?: string;
  caseId?: string;
}

export type CaseStatus = "pending_review" | "approved" | "changes_requested";

export interface CaseSummary {
  case_id: string;
  patient_id: string | null;
  patient_name: string;
  assessed_date: string;
  status: CaseStatus;
  top_service: string | null;
  top_category: string | null;
  top_confidence: Confidence | null;
  discrepancy_count: number;
  assessment_count: number;
}

export interface StoredAssessment {
  assessment_id: string;
  created_at: string;
  status: CaseStatus;
  note: string;
  agent_result: AgentResult;
  report: ReferralReport;
}

export interface PatientCase {
  case_id: string;
  patient_id: string | null;
  patient_name: string;
  created_at: string;
  updated_at: string;
  assessments: StoredAssessment[];
}

export interface CaseStats {
  total_cases: number;
  pending_review: number;
  approved: number;
  changes_requested: number;
  discrepancies_flagged: number;
  assessed_this_month: number;
  discrepancies_this_week: number;
}

// --- Referral intake & coordination layer ---

export type ReferralSource =
  | "ward_nursing"
  | "ot"
  | "discharge_liaison"
  | "community_social_worker"
  | "self_family";

export type ReferralStatus =
  | "new"
  | "screened"
  | "assigned"
  | "in_progress"
  | "report_ready"
  | "approved"
  | "closed_information_only"
  | "closed_redirected";

export type ScreeningOutcome =
  | "information_only"
  | "redirect"
  | "proportionate_assessment";

export interface Referral {
  referral_id: string;
  patient_id: string | null;
  patient_name: string;
  source: ReferralSource;
  reason_for_referral: string;
  electronic_note: string | null;
  handover_note: string | null;
  referred_at: string;
  status: ReferralStatus;
  assigned_worker: string | null;
  screening_outcome: ScreeningOutcome | null;
  screening_notes: string | null;
  verification_flag: string | null;
  case_id: string | null;
}
