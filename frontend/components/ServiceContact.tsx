// Small contact line (phone · address) shown under a recommended service.
export default function ServiceContact({
  phone,
  address,
}: {
  phone?: string;
  address?: string;
}) {
  if (!phone && !address) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
      {phone && (
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {phone}
        </span>
      )}
      {phone && address && <span className="text-gray-300">·</span>}
      {address && <span>{address}</span>}
    </p>
  );
}
