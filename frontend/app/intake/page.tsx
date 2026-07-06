"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AgentProgress from "@/components/AgentProgress";
import DomainBar from "@/components/DomainBar";
import IntakeForm from "@/components/IntakeForm";
import PdfUpload from "@/components/PdfUpload";
import { ApiError, uploadDocument, type RunAgentRequest } from "@/lib/api";
import { runPipeline } from "@/lib/pipeline";
import { saveResult } from "@/lib/storage";

type Tab = "form" | "upload";

export default function IntakePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(request: RunAgentRequest) {
    setLoading(true);
    setError(null);
    try {
      saveResult(await runPipeline(request));
      router.push("/results");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function runPdf(file: File) {
    setLoading(true);
    setError(null);
    try {
      const upload = await uploadDocument(file);
      if (!upload.raw_text.trim()) {
        throw new ApiError("No readable text could be extracted from that PDF.");
      }
      await run({
        raw_text: upload.raw_text,
        source_notes: [{ source: "Referral letter (PDF)", text: upload.raw_text }],
        patient_name: file.name.replace(/\.pdf$/i, ""),
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not process that PDF.");
      setLoading(false);
    }
  }

  return (
    <>
      <DomainBar />
      <main className="mx-auto max-w-3xl p-8">
        {loading ? (
          <AgentProgress />
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">New Patient Assessment</h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete the intake form to begin the automated referral process.
            </p>

            <div className="mt-6 inline-flex rounded-md border border-gray-200 bg-white p-1">
              <TabButton active={tab === "form"} onClick={() => setTab("form")}>Manual Entry</TabButton>
              <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>Upload Document</TabButton>
            </div>

            {error && (
              <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}

            <div className="mt-6">
              {tab === "form" ? (
                <IntakeForm onRun={run} disabled={loading} />
              ) : (
                <PdfUpload onRunPdf={runPdf} disabled={loading} />
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
