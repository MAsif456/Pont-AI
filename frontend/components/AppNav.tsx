"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DemoRole } from "@/lib/roles";
import { useRole } from "./RoleProvider";
import RoleSwitcher from "./RoleSwitcher";

// Persistent top navigation. The visible links depend on the active demo persona:
// the Social Worker sees the whole system; clinical roles see their patients;
// family sees only their relative.
interface NavItem {
  href: string;
  label: string;
  icon: () => React.JSX.Element;
  allow: DemoRole[];
}

const ALL_CLINICAL: DemoRole[] = ["ward_nurse", "ot_discharge", "consultant"];

const NAV: NavItem[] = [
  { href: "/cases", label: "Dashboard", icon: BarChartIcon, allow: ["social_worker"] },
  { href: "/my-patients", label: "My Patients", icon: UsersIcon, allow: ALL_CLINICAL },
  { href: "/my-relative", label: "My Relative", icon: HeartIcon, allow: ["family"] },
  { href: "/board", label: "Referral Board", icon: BoardIcon, allow: ["social_worker", ...ALL_CLINICAL] },
  { href: "/intake", label: "New Assessment", icon: PlusIcon, allow: ["social_worker"] },
  { href: "/reports", label: "Reports", icon: DocIcon, allow: ["social_worker"] },
  { href: "/coordination", label: "Coordination", icon: NetworkIcon, allow: ["social_worker"] },
];

export default function AppNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const items = NAV.filter((item) => item.allow.includes(role));

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <PulseIcon />
          </span>
          <span className="text-lg font-bold text-blue-900">Pont AI</span>
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1">
          {items.map((item) => {
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
        <RoleSwitcher />
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

function NetworkIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="19" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M7.2 7.3 10.5 16M16.8 7.3 13.5 16M7.2 6h9.6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
