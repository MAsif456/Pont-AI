"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { DemoRole } from "@/lib/roles";
import { useRole } from "./RoleProvider";

// Demo-grade route guard (not security): if the current persona isn't allowed on
// a page, bounce them to their own home portal. Renders nothing while redirecting.
export default function RoleGuard({
  allow,
  children,
}: {
  allow: DemoRole[];
  children: React.ReactNode;
}) {
  const { role, meta } = useRole();
  const router = useRouter();
  const allowed = allow.includes(role);

  useEffect(() => {
    if (!allowed) router.replace(meta.home);
  }, [allowed, meta.home, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
