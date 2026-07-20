// Demo personas for the role switcher. There is no login — switching persona is
// purely client-side and changes which nav/pages are visible and how a logged
// update/note is attributed. The role strings map onto the backend's free-text
// actor roles (normalise_role) and clinical-update sources, so no auth is needed.

export type DemoRole = "social_worker" | "ward_nurse" | "ot_discharge" | "consultant" | "family";

export interface RoleMeta {
  role: DemoRole;
  label: string;
  subLabel: string;
  initials: string;
  // Backend actor_role / clinical-update source this persona logs under.
  actorRole: string;
  // Landing route for this persona.
  home: string;
  // Family personas are bound to a single relative.
  boundPatientId?: string;
  boundPatientName?: string;
}

export const ROLES: Record<DemoRole, RoleMeta> = {
  social_worker: {
    role: "social_worker",
    label: "Social Worker",
    subLabel: "S. Parry · Cardiff CC",
    initials: "SP",
    actorRole: "Social Worker",
    home: "/cases",
  },
  ward_nurse: {
    role: "ward_nurse",
    label: "Ward Nurse",
    subLabel: "UHW Ward 7",
    initials: "RN",
    actorRole: "Ward Nurse",
    home: "/my-patients",
  },
  ot_discharge: {
    role: "ot_discharge",
    label: "OT / Discharge Liaison",
    subLabel: "Discharge Liaison Team",
    initials: "OT",
    actorRole: "OT",
    home: "/my-patients",
  },
  consultant: {
    role: "consultant",
    label: "Consultant",
    subLabel: "Dr. M. Patel",
    initials: "Dr",
    actorRole: "Consultant",
    home: "/my-patients",
  },
  family: {
    role: "family",
    label: "Family Member",
    subLabel: "Daughter of Gwendoline Pritchard",
    initials: "FM",
    actorRole: "Family/Carer",
    home: "/my-relative",
    boundPatientId: "PT-001",
    boundPatientName: "Gwendoline Pritchard",
  },
};

export const ROLE_ORDER: DemoRole[] = [
  "social_worker",
  "ward_nurse",
  "ot_discharge",
  "consultant",
  "family",
];

// The three clinical personas that share the "My Patients" portal.
export const CLINICAL_ROLES: DemoRole[] = ["ward_nurse", "ot_discharge", "consultant"];

export const DEFAULT_ROLE: DemoRole = "social_worker";
