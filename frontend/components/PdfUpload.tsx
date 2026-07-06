"use client";

import { useState } from "react";

interface Props {
  onRunPdf: (file: File) => void;
  disabled: boolean;
}

export default function PdfUpload({ onRunPdf, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const chosen = files?.[0];
    if (chosen) setFile(chosen);
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition ${
          dragging ? "border-blue-400 bg-blue-50/50" : "border-gray-300"
        }`}
      >
        <input type="file" accept="application/pdf" className="hidden" disabled={disabled} onChange={(e) => pick(e.target.files)} />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        {file ? (
          <span className="font-medium text-gray-800">{file.name}</span>
        ) : (
          <>
            <span className="font-semibold text-gray-800">Drag and drop a referral letter or assessment PDF</span>
            <span className="text-sm text-gray-400">or click to browse</span>
          </>
        )}
        <span className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700">
          Browse files
        </span>
      </label>

      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
        Pont will extract patient details automatically. You can review the results after running the agent.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled || !file}
          onClick={() => file && onRunPdf(file)}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Run Social Care Agent
        </button>
      </div>
    </div>
  );
}
