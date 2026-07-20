"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar, CaseloadStatusBadge } from "@/components/Badges";
import LogUpdateForm from "@/components/LogUpdateForm";
import RoleGuard from "@/components/RoleGuard";
import { useRole } from "@/components/RoleProvider";
import { getCaseload, listReferrals } from "@/lib/api";
import type { CaseloadRow, Referral } from "@/lib/types";

export default function MyPatientsPage() {
  return (
    <RoleGuard allow={["ward_nurse", "ot_discharge", "consultant", "social_worker"]}>
      <MyPatients />
    </RoleGuard>
  );
}

function MyPatients() {
  const { meta } = useRole();
  const [rows, setRows] = useState<CaseloadRow[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    getCaseload()
      .then((list) => setRows(list.filter((row) => row.referral_id)))
      .catch(() => setError("Could not load patients (is the backend running?)."));
    listReferrals()
      .then((list) => {
        const map: Record<string, string> = {};
        for (const referral of list as Referral[]) {
          if (referral.patient_id) map[referral.patient_id] = referral.reason_for_referral;
        }
        setReasons(map);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        {meta.label} Portal
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">My Patients</h1>
      <p className="mt-1 text-sm text-gray-500">
        {meta.subLabel} — active discharge cases. Log an update and Pont notifies the social care
        team, which can trigger a reassessment.
      </p>

      {error && <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {rows?.map((row) => (
          <article key={row.patient_id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={row.name} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{row.name}</h2>
                    <CaseloadStatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {row.postcode_area} · Age {row.age ?? "—"} · {row.dementia_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {row.referral_id && (
                  <Link
                    href={`/referrals/${row.referral_id}`}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    View referral
                  </Link>
                )}
                <button
                  onClick={() => setOpenId((id) => (id === row.patient_id ? null : row.patient_id))}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {openId === row.patient_id ? "Close" : "Log update"}
                </button>
              </div>
            </div>

            {reasons[row.patient_id] && (
              <p className="mt-2 text-sm text-gray-600">{reasons[row.patient_id]}</p>
            )}

            {openId === row.patient_id && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <LogUpdateForm patientId={row.patient_id} defaultSource={meta.actorRole} />
              </div>
            )}
          </article>
        ))}
        {rows?.length === 0 && (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            No active patients right now.
          </p>
        )}
        {!rows && !error && <p className="text-sm text-gray-400">Loading…</p>}
      </div>
    </main>
  );
}
