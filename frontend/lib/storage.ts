// Hands the pipeline result from the intake page to the results page. The
// prototype has no backend persistence, so sessionStorage is the simplest carrier.

import type { PipelineResult } from "./types";

const KEY = "pont:lastResult";

export function saveResult(result: PipelineResult): void {
  sessionStorage.setItem(KEY, JSON.stringify(result));
}

export function loadResult(): PipelineResult | null {
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as PipelineResult) : null;
}
