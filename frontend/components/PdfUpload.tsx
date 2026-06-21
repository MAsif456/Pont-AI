"use client";

import { useState } from "react";

interface Props {
  onRunPdf: (file: File) => void;
  disabled: boolean;
}

export default function PdfUpload({ onRunPdf, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Upload a GP referral letter or social worker assessment (PDF). Pont
        extracts the text and runs the same referral pipeline over it.
      </p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 hover:border-blue-400 dark:border-gray-600">
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <span className="font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
        ) : (
          <span>Click to choose a PDF file</span>
        )}
      </label>
      <button
        type="button"
        disabled={disabled || !file}
        className="w-fit rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        onClick={() => file && onRunPdf(file)}
      >
        Extract and run referral
      </button>
    </div>
  );
}
