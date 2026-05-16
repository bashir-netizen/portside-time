"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { audit } from "@/lib/audit";
import { getCompanyConfig, updateCompanyConfig } from "@/lib/config";

const CompanyConfigSchema = z.object({
  gracePeriodMinutes: z.coerce.number().int().min(0).max(120),
  justificationWindowHours: z.coerce.number().int().min(1).max(168),
  annualLeaveAccrualPerMonth: z.coerce.number().min(0).max(10),
  perDiemDefaultDjf: z
    .union([z.coerce.number().int().min(0), z.literal("").transform(() => null)])
    .nullable(),
});

export type SaveCompanyConfigResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function saveCompanyConfigAction(
  _prev: SaveCompanyConfigResult | null,
  formData: FormData,
): Promise<SaveCompanyConfigResult> {
  const ctx = await requireAdmin();
  const raw = {
    gracePeriodMinutes: formData.get("gracePeriodMinutes"),
    justificationWindowHours: formData.get("justificationWindowHours"),
    annualLeaveAccrualPerMonth: formData.get("annualLeaveAccrualPerMonth"),
    perDiemDefaultDjf: formData.get("perDiemDefaultDjf") ?? "",
  };
  const parsed = CompanyConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const before = await getCompanyConfig();
  const after = await updateCompanyConfig(
    {
      gracePeriodMinutes: parsed.data.gracePeriodMinutes,
      justificationWindowHours: parsed.data.justificationWindowHours,
      annualLeaveAccrualPerMonth: parsed.data.annualLeaveAccrualPerMonth,
      perDiemDefaultDjf: parsed.data.perDiemDefaultDjf,
    },
    ctx.session.userId ?? null,
  );

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "company_config_updated",
    entityType: "company_config",
    entityId: "default",
    before,
    after,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
