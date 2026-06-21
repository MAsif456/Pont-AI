import type { NeedsProfile } from "@/lib/types";

export default function NeedsProfileView({ profile }: { profile: NeedsProfile }) {
  const facts: [string, string][] = [
    ["Dementia stage", profile.dementia_stage],
    ["Living situation", profile.living_situation],
    ["Mobility", profile.mobility_needs],
    ["Carer status", profile.carer_status],
  ];
  return (
    <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <h2 className="text-lg font-semibold">Extracted needs profile</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{profile.summary}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="text-sm font-medium capitalize">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {profile.key_risks.length > 0 && (
        <div className="mt-4">
          <span className="text-xs uppercase tracking-wide text-gray-400">Key risks</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {profile.key_risks.map((risk) => (
              <span key={risk} className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                {risk}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
