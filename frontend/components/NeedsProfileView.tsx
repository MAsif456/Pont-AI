import type { NeedsProfile } from "@/lib/types";

// Polished patient/needs summary card, matching the report design: an uppercase
// micro-header, a fact grid drawn from the extracted patient details (falling back
// to the needs profile for older assessments), and the identified needs as pills.
export default function NeedsProfileView({ profile }: { profile: NeedsProfile }) {
  const details = profile.patient_details;
  const facts = (
    [
      ["Age", details?.age ?? ""],
      ["Postcode", details?.postcode_area ?? ""],
      ["Dementia type", details?.dementia_type ?? ""],
      ["Diagnosis stage", details?.diagnosis_stage || profile.dementia_stage],
      ["Living situation", details?.living_situation || profile.living_situation],
      ["Mobility", details?.mobility || profile.mobility_needs],
      ["Carer", details?.carer_present || profile.carer_status],
    ] as [string, string][]
  ).filter(([, value]) => value);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Needs profile</h2>
      {profile.summary && <p className="mt-2 text-sm text-gray-600">{profile.summary}</p>}

      {facts.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium capitalize text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {profile.key_risks.length > 0 && (
        <div className="mt-5">
          <span className="text-xs uppercase tracking-wide text-gray-400">Identified needs</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.key_risks.map((risk) => (
              <span
                key={risk}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
              >
                {risk}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
