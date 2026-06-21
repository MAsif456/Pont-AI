"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import AgentProgress from "@/components/AgentProgress";
import DemoPicker from "@/components/DemoPicker";
import IntakeForm from "@/components/IntakeForm";
import PdfUpload from "@/components/PdfUpload";
import { ApiError, uploadDocument, type RunAgentRequest } from "@/lib/api";
import { runPipeline } from "@/lib/pipeline";
import { saveResult } from "@/lib/storage";

type Tab = "demo" | "form" | "upload";

const TABS: { id: Tab; label: string }[] = [
  { id: "demo", label: "Demo patient" },
  { id: "form", label: "Manual form" },
  { id: "upload", label: "Upload PDF" },
];

export default function IntakePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("demo");
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

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <AgentProgress />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">New referral</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Choose how to provide the patient assessment.
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6">
        {tab === "demo" && <DemoPicker onRun={run} disabled={loading} />}
        {tab === "form" && <IntakeForm onRun={run} disabled={loading} />}
        {tab === "upload" && <PdfUpload onRunPdf={runPdf} disabled={loading} />}
      </div>
    </main>
  );
}
