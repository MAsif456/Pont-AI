"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { DEFAULT_ROLE, ROLES, type DemoRole, type RoleMeta } from "@/lib/roles";

const STORAGE_KEY = "pont:demoRole";

interface RoleContextValue {
  role: DemoRole;
  meta: RoleMeta;
  setRole: (role: DemoRole) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

// Holds the current demo persona, persisted to localStorage so it survives a
// refresh. Renders children immediately with the default and hydrates the saved
// role after mount to avoid a server/client mismatch.
export default function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(DEFAULT_ROLE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && saved in ROLES) setRoleState(saved as DemoRole);
  }, []);

  function setRole(next: DemoRole) {
    setRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <RoleContext.Provider value={{ role, meta: ROLES[role], setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const value = useContext(RoleContext);
  if (!value) throw new Error("useRole must be used within a RoleProvider");
  return value;
}
