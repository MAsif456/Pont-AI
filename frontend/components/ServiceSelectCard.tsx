"use client";

import { useState } from "react";

import { ConfidenceBadge } from "@/components/Badges";
import type { Recommendation } from "@/lib/types";

// A recommended service that can be included/excluded from the referral (the
// social worker curates the final set), with an expandable justification.
export default function ServiceSelectCard({
  recommendation,
  included,
  onToggle,
  highlighted,
}: {
  recommendation: Recommendation;
  included: boolean;
  onToggle: () => void;
  highlighted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className={`rounded-lg border bg-white p-4 transition ${
        highlighted ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
      } ${included ? "" : "opacity-60"}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={included}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{recommendation.name}</h3>
              <span className="mt-0.5 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {recommendation.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {recommendation.recommended_for_human_review ? (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                  Low — human review recommended
                </span>
              ) : (
                <ConfidenceBadge confidence={recommendation.confidence} />
              )}
              <button
                onClick={() => setOpen((v) => !v)}
                className="rounded border border-gray-200 px-1.5 text-gray-400 hover:bg-gray-50"
                aria-label="Toggle details"
              >
                {open ? "▴" : "▾"}
              </button>
            </div>
          </div>
          {open && (
            <p className="mt-2 text-sm text-gray-600">{recommendation.justification}</p>
          )}
        </div>
      </div>
    </article>
  );
}
