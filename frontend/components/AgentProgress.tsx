"use client";

import { useEffect, useState } from "react";

// The agent runs server-side in a single request, so these phases are advanced on
// a timer to reflect what the agent is actually doing. The real, logged steps are
// shown afterwards in the reasoning trail.
const PHASES = [
  "Extracting patient needs",
  "Checking clinical context",
  "Checking family context",
  "Searching relevant services",
  "Reviewing results",
  "Finalising recommendations",
];

export default function AgentProgress() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, PHASES.length - 1));
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  const progress = ((index + 1) / PHASES.length) * 100;

  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8" role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <h2 className="mt-3 text-lg font-semibold">Social Care Agent is working</h2>
        <p className="text-sm text-gray-400">This usually takes a few seconds</p>
      </div>

      <ol className="mt-6 space-y-3">
        {PHASES.map((phase, i) => (
          <li key={phase} className="flex items-center gap-3">
            <StepIcon state={i < index ? "done" : i === index ? "active" : "pending"} />
            <span className={`text-sm ${i === index ? "font-medium text-blue-700" : i < index ? "text-gray-700" : "text-gray-400"}`}>
              {phase}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />;
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-200" />;
}
