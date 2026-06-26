// Note cross-check warning, styled consistently with DiscrepancyAlert so the
// "two sources disagree" signal looks the same across the product.
export default function VerificationFlag({
  flag,
  compact = false,
}: {
  flag: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        ⚠ Note conflict
      </span>
    );
  }
  return (
    <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
      <span className="font-semibold">⚠ Verification needed: </span>
      {flag}
    </div>
  );
}
