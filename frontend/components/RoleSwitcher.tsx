"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ROLE_ORDER, ROLES, type DemoRole } from "@/lib/roles";
import { useRole } from "./RoleProvider";

// Top-right "demo mode" persona switcher. No login — selecting a persona changes
// which portal the user sees and how their updates/notes are attributed.
export default function RoleSwitcher() {
  const { role, meta, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(next: DemoRole) {
    setRole(next);
    setOpen(false);
    router.push(ROLES[next].home);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-blue-50/60 px-2.5 py-1.5 text-left transition hover:bg-blue-50"
      >
        <Avatar initials={meta.initials} />
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-semibold text-blue-900">{meta.label}</span>
          <span className="block text-xs text-gray-500">{meta.subLabel}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Switch role — demo mode
          </p>
          {ROLE_ORDER.map((option) => {
            const info = ROLES[option];
            const active = option === role;
            return (
              <button
                key={option}
                onClick={() => choose(option)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                  active ? "bg-blue-50/50" : ""
                }`}
              >
                <Avatar initials={info.initials} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-medium text-gray-800">{info.label}</span>
                  <span className="block truncate text-xs text-gray-500">{info.subLabel}</span>
                </span>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-xs font-semibold text-blue-700">
      {initials}
    </span>
  );
}
