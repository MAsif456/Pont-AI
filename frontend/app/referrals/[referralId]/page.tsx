"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import AgentProgress from "@/components/AgentProgress";
import AssessmentView from "@/components/AssessmentView";
import { ReferralStatusBadge } from "@/components/Badges";
import VerificationFlag from "@/components/VerificationFlag";
import {
  ApiError,
  approveReferral,
  assignReferral,
  completeReferral,
  getCase,
  getReferral,
  screenReferral,
  startReferral,
  updateCaseStatus,
  type RunAgentRequest,
} from "@/lib/api";
import {
  REFERRAL_SOURCE_LABEL,
  SCREENING_OUTCOME_LABEL,
  formatDateTime,
} from "@/lib/format";
import { runPipeline } from "@/lib/pipeline";
import type { PatientCase, Referral } from "@/lib/types";

export default function ReferralDetailPage() {
  const { referralId } = useParams<{ referralId: string }>();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [caseData, setCaseData] = useState<PatientCase | null>(null);
  const [busy, setBusy] = useState<"screening" | "assigning" | "running" | "approving" | null>(null);
  const [worker, setWorker] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const loaded = await getReferral(referralId);
    setReferral(loaded);
    if (loaded.case_id) setCaseData(await getCase(loaded.case_id));
  }, [referralId]);

  useEffect(() => {
    // Data is fetched on mount; setting error state from the async catch here is
    // the intended pattern, so the cascading-render lint rule does not apply.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => setError("Could not load this referral."));
  }, [load]);

  async function act(label: typeof busy, action: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await action();
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const runAgent = () =>
    act("running", async () => {
      await startReferral(referralId);
      const result = await runPipeline(buildAgentRequest(referral!));
      await completeReferral(referralId, result.caseId!);
    });

  const approve = () =>
    act("approving", async () => {
      await updateCaseStatus(referral!.case_id!, "approved");
      await approveReferral(referralId);
    });

  if (error && !referral) return <Shell><p className="text-red-600">{error}</p></Shell>;
  if (!referral) return <Shell><p className="text-gray-400">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{referral.patient_name}</h1>
        <ReferralStatusBadge status={referral.status} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {REFERRAL_SOURCE_LABEL[referral.source]} · referred {formatDateTime(referral.referred_at)}
        {referral.patient_id ? ` · patient ${referral.patient_id}` : " · not yet in system"}
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <ReferralInfo referral={referral} />
      {referral.verification_flag && (
        <div className="mt-4">
          <VerificationFlag flag={referral.verification_flag} />
        </div>
      )}

      <div className="mt-6">
        <ActionPanel
          referral={referral}
          busy={busy}
          worker={worker}
          setWorker={setWorker}
          onScreen={() => act("screening", () => screenReferral(referralId))}
          onAssign={() => act("assigning", () => assignReferral(referralId, worker.trim() || "Me"))}
          onRun={runAgent}
          onApprove={approve}
        />
      </div>

      {caseData && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Assessment & report</h2>
          <AssessmentView assessment={caseData.assessments[caseData.assessments.length - 1]} />
        </div>
      )}
    </Shell>
  );
}

function buildAgentRequest(referral: Referral): RunAgentRequest {
  if (referral.patient_id) {
    return { patient_id: referral.patient_id, patient_name: referral.patient_name };
  }
  const notes = [
    referral.electronic_note && { source: "Electronic record", text: referral.electronic_note },
    referral.handover_note && { source: "Handover note", text: referral.handover_note },
  ].filter(Boolean) as { source: string; text: string }[];
  return {
    patient_name: referral.patient_name,
    raw_text: referral.reason_for_referral,
    source_notes: notes,
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/board" className="text-sm text-blue-600 hover:underline">
        ← Coordination board
      </Link>
      <div className="mt-2">{children}</div>
    </main>
  );
}

function ReferralInfo({ referral }: { referral: Referral }) {
  return (
    <section className="mt-5 rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700">Reason for referral</h2>
      <p className="mt-1 text-sm text-gray-600">{referral.reason_for_referral}</p>

      {(referral.electronic_note || referral.handover_note) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NoteBox title="Electronic record" text={referral.electronic_note} />
          <NoteBox title="Paper / handover note" text={referral.handover_note} />
        </div>
      )}

      {referral.screening_outcome && (
        <div className="mt-4 rounded-md bg-gray-50 p-3">
          <p className="text-sm font-medium">
            Screening: {SCREENING_OUTCOME_LABEL[referral.screening_outcome]}
          </p>
          {referral.screening_notes && (
            <p className="mt-1 text-sm text-gray-600">{referral.screening_notes}</p>
          )}
        </div>
      )}
      {referral.assigned_worker && (
        <p className="mt-3 text-sm text-gray-500">Assigned to {referral.assigned_worker}</p>
      )}
    </section>
  );
}

function NoteBox({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{text ?? "—"}</p>
    </div>
  );
}

interface ActionProps {
  referral: Referral;
  busy: string | null;
  worker: string;
  setWorker: (value: string) => void;
  onScreen: () => void;
  onAssign: () => void;
  onRun: () => void;
  onApprove: () => void;
}

function ActionPanel(props: ActionProps) {
  const { referral, busy } = props;

  if (busy === "running") return <AgentProgress />;

  if (referral.status === "new") {
    return <PrimaryButton onClick={props.onScreen} busy={busy === "screening"} label="Screen referral" />;
  }
  if (referral.status === "screened") {
    return <AssignControl {...props} />;
  }
  if (referral.status === "assigned") {
    return (
      <PrimaryButton onClick={props.onRun} busy={false} label="Run Social Care Agent for this referral" />
    );
  }
  if (referral.status === "report_ready") {
    return (
      <PrimaryButton
        onClick={props.onApprove}
        busy={busy === "approving"}
        label="Approve report"
        colour="bg-green-600 hover:bg-green-700"
      />
    );
  }
  if (referral.status === "approved") {
    return <Banner className="bg-green-50 text-green-700">✓ Report approved.</Banner>;
  }
  return (
    <Banner className="bg-gray-100 text-gray-500">
      This referral is closed ({SCREENING_OUTCOME_LABEL[referral.screening_outcome ?? "information_only"]}).
      No assessment required.
    </Banner>
  );
}

function AssignControl({ worker, setWorker, onAssign, busy }: ActionProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={worker}
        onChange={(event) => setWorker(event.target.value)}
        placeholder="Worker name"
        className="rounded-md border border-gray-300 p-2.5 text-sm"
      />
      <PrimaryButton onClick={onAssign} busy={busy === "assigning"} label="Assign & claim" />
    </div>
  );
}

function PrimaryButton({
  onClick,
  busy,
  label,
  colour = "bg-blue-600 hover:bg-blue-700",
}: {
  onClick: () => void;
  busy: boolean;
  label: string;
  colour?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-md px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 ${colour}`}
    >
      {busy ? "Working…" : label}
    </button>
  );
}

function Banner({ children, className }: { children: React.ReactNode; className: string }) {
  return <div className={`rounded-md p-4 text-sm font-medium ${className}`}>{children}</div>;
}
