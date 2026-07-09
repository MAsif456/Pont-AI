import type { ReferralReport } from "@/lib/types";

// The generated referral report. The patient summary and identified needs are
// already shown by the needs-profile card above, so here we surface only the
// flagged risks, the context the agent referenced, and the human-review notice.
export default function ReportView({ report }: { report: ReferralReport }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Referral report</h2>

      <Pills heading="Flagged risks" items={report.flagged_risks} />

      {report.clinical_context_referenced && (
        <Paragraph heading="Clinical context referenced" text={report.clinical_context_referenced} />
      )}
      {report.family_context_referenced && (
        <Paragraph heading="Family context referenced" text={report.family_context_referenced} />
      )}

      <p className="mt-5 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
        <span aria-hidden>⚠</span>
        <span>{report.human_review_statement}</span>
      </p>
    </section>
  );
}

function Pills({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs uppercase tracking-wide text-gray-400">{heading}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Paragraph({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs uppercase tracking-wide text-gray-400">{heading}</h3>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </div>
  );
}
