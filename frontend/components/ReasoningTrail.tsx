import type { ReasoningStep } from "@/lib/types";

// Shows the agent's actual logged tool calls, so the reviewer can see what was
// searched and considered, not just the final picks. Collapsible to keep the
// results page focused by default.
export default function ReasoningTrail({
  steps,
  toolCalls,
}: {
  steps: ReasoningStep[];
  toolCalls: number;
}) {
  return (
    <details className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <summary className="cursor-pointer text-lg font-semibold">
        Reasoning trail
        <span className="ml-2 text-sm font-normal text-gray-400">
          ({toolCalls} tool call{toolCalls === 1 ? "" : "s"})
        </span>
      </summary>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="border-l-2 border-blue-200 pl-3 dark:border-blue-900">
            <p className="text-sm font-medium">
              <span className="text-blue-600">{step.tool}</span>
              {step.tool_input && (
                <span className="text-gray-400"> · {step.tool_input}</span>
              )}
            </p>
            {step.summary && <p className="text-sm text-gray-600 dark:text-gray-300">{step.summary}</p>}
            {step.reasoning && <p className="text-xs italic text-gray-400">{step.reasoning}</p>}
          </li>
        ))}
      </ol>
    </details>
  );
}
