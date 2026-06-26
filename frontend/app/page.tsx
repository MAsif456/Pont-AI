import Link from "next/link";

// Placeholder landing page for Phase A. The full patient intake form and
// PDF-upload flow are built in Phase D and live at /intake.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Pont AI</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          AI-assisted social-care referral matching for dementia patients in
          Cardiff.
        </p>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter a patient needs assessment or upload a referral letter, and Pont
        extracts a structured needs profile, retrieves relevant Cardiff Council
        services, and drafts a referral report for human review.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/board"
          className="w-fit rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Coordination board
        </Link>
        <Link
          href="/intake"
          className="w-fit rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Start a referral
        </Link>
        <Link
          href="/cases"
          className="w-fit rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Case dashboard
        </Link>
      </div>
    </main>
  );
}
