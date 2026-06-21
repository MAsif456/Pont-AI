import type { ReferralReport } from "@/lib/types";

export default function ReportView({ report }: { report: ReferralReport }) {
  return (
    <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-700">
      <h2 className="text-lg font-semibold">Referral report</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{report.patient_summary}</p>

      <Block heading="Identified needs" items={report.identified_needs} />
      <Block heading="Flagged risks" items={report.flagged_risks} />

      {report.clinical_context_referenced && (
        <Paragraph heading="Clinical context referenced" text={report.clinical_context_referenced} />
      )}
      {report.family_context_referenced && (
        <Paragraph heading="Family context referenced" text={report.family_context_referenced} />
      )}

      <p className="mt-5 rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
        {report.human_review_statement}
      </p>
    </section>
  );
}

function Block({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{heading}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Paragraph({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{heading}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  );
}
