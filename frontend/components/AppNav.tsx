"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Persistent top navigation shared across every page (the app shell in the
// mockups). Route paths are kept stable; only the labels/chrome are new.
const NAV = [
  { href: "/cases", label: "Dashboard", icon: BarChartIcon },
  { href: "/board", label: "Referral Board", icon: BoardIcon },
  { href: "/intake", label: "New Assessment", icon: PlusIcon },
  { href: "/reports", label: "Reports", icon: DocIcon },
];

export default function AppNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <PulseIcon />
          </span>
          <span className="text-lg font-bold text-blue-900">Pont AI</span>
        </Link>
        <div className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PulseIcon() {
  return (
    <svg {...iconProps} stroke="white">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg {...iconProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
    </svg>
  );
}
