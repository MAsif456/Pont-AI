// The "Coordinating domains" sub-header from the mockups. Reflects the multi-agent
// architecture: the Social Care agent is the active one; Clinical and Family are
// the domains it queries.
const DOMAINS = [
  { key: "clinical", label: "Clinical", active: false },
  { key: "social", label: "Social Care", active: true },
  { key: "family", label: "Family", active: false },
];

export default function DomainBar() {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3 text-sm">
        <span className="text-gray-500">Coordinating domains:</span>
        <div className="flex items-center gap-2">
          {DOMAINS.map((domain, index) => (
            <div key={domain.key} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  domain.active ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-600"
                }`}
              >
                {domain.label}
                <span className={`h-1.5 w-1.5 rounded-full ${domain.active ? "bg-white" : "bg-gray-400"}`} />
              </span>
              {index < DOMAINS.length - 1 && <span className="text-gray-300">—</span>}
            </div>
          ))}
        </div>
        <span className="text-gray-400">Social Care agent is active</span>
      </div>
    </div>
  );
}
