import { db } from "@/lib/db";

/**
 * CompanyConfig singleton — one row, id="default". `getCompanyConfig()`
 * auto-creates with spec defaults on first call so the app works on a
 * fresh DB without manual seeding.
 *
 * Reads happen in:
 *  - leave accrual (annualLeaveAccrualPerMonth)
 *  - lateness check (gracePeriodMinutes)
 *  - justification deadline (justificationWindowHours)
 *  - per-diem owed on busy days (perDiemDefaultDjf)
 *  - schedule view + reports (weekStartDay, dayOffDefault, timezone)
 */

export type CompanyConfig = {
  id: string;
  gracePeriodMinutes: number;
  justificationWindowHours: number;
  annualLeaveAccrualPerMonth: number;
  perDiemDefaultDjf: number | null;
  weekStartDay: number;
  dayOffDefault: number;
  timezone: string;
  updatedAt: Date;
  updatedBy: string | null;
};

const DEFAULTS = {
  id: "default",
  gracePeriodMinutes: 15,
  justificationWindowHours: 48,
  annualLeaveAccrualPerMonth: 2.5,
  perDiemDefaultDjf: null,
  weekStartDay: 0,
  dayOffDefault: 5,
  timezone: "Africa/Djibouti",
} as const;

export async function getCompanyConfig(): Promise<CompanyConfig> {
  const existing = await db.companyConfig.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  // First-time auto-create with spec defaults
  return db.companyConfig.create({ data: DEFAULTS });
}

/**
 * Patch-style update. Pass only the fields that changed; everything else
 * is preserved. `updatedBy` should be the admin user id.
 */
export async function updateCompanyConfig(
  patch: Partial<Omit<CompanyConfig, "id" | "updatedAt">>,
  updatedBy: string | null = null,
): Promise<CompanyConfig> {
  // Ensure the row exists, then patch.
  await getCompanyConfig();
  return db.companyConfig.update({
    where: { id: "default" },
    data: { ...patch, updatedBy },
  });
}
