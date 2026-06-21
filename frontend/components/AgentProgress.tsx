"use client";

import { useEffect, useState } from "react";

// The agent runs server-side in a single request, so these phases are advanced on
// a timer to reflect what the agent is actually doing rather than showing a bare
// spinner. The real, logged steps are shown afterwards in the reasoning trail.
const PHASES = [
  "Extracting needs profile…",
  "Checking clinical context…",
  "Checking family context…",
  "Searching Cardiff services…",
  "Ranking recommendations…",
  "Drafting referral report…",
];

export default function AgentProgress() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Hold on the final phase rather than looping, so a slow request never
    // appears to "restart".
    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, PHASES.length - 1));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-16" role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
        {PHASES[index]}
      </p>
      <ol className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
        {PHASES.map((phase, i) => (
          <li
            key={phase}
            className={i <= index ? "text-blue-600 dark:text-blue-400" : ""}
          >
            {i < index ? "✓ " : "• "}
            {phase.replace("…", "")}
          </li>
        ))}
      </ol>
    </div>
  );
}
