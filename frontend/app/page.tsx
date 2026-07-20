"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useRole } from "@/components/RoleProvider";

// Opens on the current persona's home portal (Social Worker → Dashboard,
// clinical → My Patients, family → My Relative).
export default function Home() {
  const { meta } = useRole();
  const router = useRouter();

  useEffect(() => {
    router.replace(meta.home);
  }, [meta.home, router]);

  return <main className="p-8 text-gray-400">Loading…</main>;
}
