"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { computePeriodReport } from "@/lib/reports/compute";
import { renderCombinedCsv } from "@/lib/reports/csv";
import { renderEmployeePdf } from "@/lib/reports/pdf";
import { periodWindow } from "@/lib/reports/period";

const EXPORT_ROOT = process.env.NODE_ENV === "production" ? "/data/exports" : "./exports";

export async function lockAndExportAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const periodYmd = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}-01$/.test(periodYmd)) {
    throw new Error("Bad period.");
  }
  const period = periodWindow(periodYmd);

  // Already-locked guard
  const existingLocked = await db.monthlyReport.findFirst({
    where: { periodStart: period.start, locked: true },
  });
  if (existingLocked) {
    redirect(`/admin/reports/${periodYmd}`);
  }

  // Re-compute fresh
  const reports = await computePeriodReport({
    periodStart: period.start,
    periodEnd: period.end,
  });

  const adminUser = ctx.session.userId
    ? await db.user.findUnique({ where: { id: ctx.session.userId } })
    : null;
  const signatureLine = `${adminUser?.email ?? "admin"} on ${new Date().toISOString()}`;

  // Build PDFs + CSV + ZIP
  const zip = new JSZip();
  const csv = renderCombinedCsv({
    periodLabel: period.label,
    rows: reports,
  });
  zip.file(`${periodYmd}-combined.csv`, csv);

  for (const r of reports) {
    const pdfBuf = await renderEmployeePdf({
      report: r,
      periodLabel: period.label,
      signatureLine,
    });
    zip.file(
      `${periodYmd}-${slug(r.fullName)}.pdf`,
      pdfBuf,
    );
  }

  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  const folder = path.join(EXPORT_ROOT, periodYmd);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, `${periodYmd}-combined.csv`), csv);
  await fs.writeFile(
    path.join(folder, `${periodYmd}-all.zip`),
    zipBuf,
  );

  // Persist MonthlyReport rows + flip adjustments to applied
  for (const r of reports) {
    await db.monthlyReport.upsert({
      where: {
        employeeId_periodStart: {
          employeeId: r.employeeId,
          periodStart: period.start,
        },
      },
      create: {
        employeeId: r.employeeId,
        periodStart: period.start,
        periodEnd: period.end,
        workedHours: r.workedHours,
        scheduledHours: r.scheduledHours,
        lateCount: r.lateCount,
        lateMinutes: r.lateMinutes,
        lateDeductionDjf: r.lateDeductionDjf,
        overtimeHours: r.overtimeHours,
        overtimeAmountDjf: r.overtimeAmountDjf,
        sickDaysCertified: r.sickDaysCertified,
        sickDaysUncertified: r.sickDaysUncertified,
        vacationDays: r.vacationDays,
        holidayDays: r.holidayDays,
        unauthAbsenceDays: r.unauthAbsenceDays,
        unauthAbsenceDjf: r.unauthAbsenceDjf,
        adjustmentsDjf: r.adjustmentsDjf,
        netDeductionDjf: r.netDeductionDjf,
        netAdditionDjf: r.netAdditionDjf,
        locked: true,
        lockedAt: new Date(),
        exportedAt: new Date(),
        exportedBy: ctx.session.userId,
        exportPath: folder,
      },
      update: {
        workedHours: r.workedHours,
        scheduledHours: r.scheduledHours,
        lateCount: r.lateCount,
        lateMinutes: r.lateMinutes,
        lateDeductionDjf: r.lateDeductionDjf,
        overtimeHours: r.overtimeHours,
        overtimeAmountDjf: r.overtimeAmountDjf,
        sickDaysCertified: r.sickDaysCertified,
        sickDaysUncertified: r.sickDaysUncertified,
        vacationDays: r.vacationDays,
        holidayDays: r.holidayDays,
        unauthAbsenceDays: r.unauthAbsenceDays,
        unauthAbsenceDjf: r.unauthAbsenceDjf,
        adjustmentsDjf: r.adjustmentsDjf,
        netDeductionDjf: r.netDeductionDjf,
        netAdditionDjf: r.netAdditionDjf,
        locked: true,
        lockedAt: new Date(),
        exportedAt: new Date(),
        exportedBy: ctx.session.userId,
        exportPath: folder,
      },
    });
  }

  // Mark adjustments as applied in this period
  await db.adjustment.updateMany({
    where: {
      appliedInPeriodStart: null,
      appliesToPeriodStart: { lt: period.start },
    },
    data: { appliedInPeriodStart: period.start },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "monthly_locked_and_exported",
    entityType: "monthly_report",
    entityId: periodYmd,
    after: { folder, employeeCount: reports.length },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/reports");
  redirect(`/admin/reports/${periodYmd}`);
}

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
