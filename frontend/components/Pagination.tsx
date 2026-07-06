// Reusable pagination control used wherever a list can grow (dashboard, board...).
export default function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-gray-500">
        Showing {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-1">
        <PageButton disabled={page === 1} onClick={() => onChange(page - 1)}>
          Previous
        </PageButton>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            onClick={() => onChange(number)}
            className={`h-8 w-8 rounded-md text-sm transition ${
              number === page
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {number}
          </button>
        ))}
        <PageButton disabled={page === pageCount} onClick={() => onChange(page + 1)}>
          Next
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
