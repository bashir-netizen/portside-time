"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword, generateRandomPin } from "@/lib/auth/password";
import {
  EmployeeCreateSchema,
  EmployeeEditSchema,
  EmployeeSetPinSchema,
} from "@/schemas/employee";
import { parseYmdInDjibouti } from "@/lib/time";

type CreateResult =
  | { ok: true; id: string; pinPlain: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createEmployeeAction(
  _prev: CreateResult | null,
  formData: FormData,
): Promise<CreateResult> {
  const ctx = await requireAdmin();
  const parsed = EmployeeCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    monthlySalary: formData.get("monthlySalary"),
    hireDate: formData.get("hireDate"),
    defaultScheduleId: formData.get("defaultScheduleId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const pinPlain = generateRandomPin(6);
  const pinHash = await hashPassword(pinPlain);

  const created = await db.employee.create({
    data: {
      fullName: parsed.data.fullName,
      position: parsed.data.position,
      monthlySalary: parsed.data.monthlySalary,
      hireDate: parseYmdInDjibouti(parsed.data.hireDate),
      defaultScheduleId: parsed.data.defaultScheduleId,
      pinHash,
      status: "active",
    },
  });

  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "employee_created",
    entityType: "employee",
    entityId: created.id,
    after: { ...parsed.data, pin: "[redacted]" },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/employees");
  return { ok: true, id: created.id, pinPlain };
}

type EditResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateEmployeeAction(
  employeeId: string,
  _prev: EditResult | null,
  formData: FormData,
): Promise<EditResult> {
  const ctx = await requireAdmin();
  const parsed = EmployeeEditSchema.safeParse({
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    monthlySalary: formData.get("monthlySalary"),
    hireDate: formData.get("hireDate"),
    defaultScheduleId: formData.get("defaultScheduleId"),
    defaultScheduleTemplateId: formData.get("defaultScheduleTemplateId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const before = await db.employee.findUnique({ where: { id: employeeId } });
  if (!before) return { ok: false, error: "Employee not found." };

  // hireDate arrives as a YYYY-MM-DD string from the form; convert to the
  // Djibouti start-of-day UTC Date that the schema stores.
  const after = await db.employee.update({
    where: { id: employeeId },
    data: {
      fullName: parsed.data.fullName,
      position: parsed.data.position,
      monthlySalary: parsed.data.monthlySalary,
      hireDate: parseYmdInDjibouti(parsed.data.hireDate),
      defaultScheduleId: parsed.data.defaultScheduleId,
      defaultScheduleTemplateId: parsed.data.defaultScheduleTemplateId,
    },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "employee_updated",
    entityType: "employee",
    entityId: employeeId,
    before,
    after,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/employees");
  redirect(`/admin/employees/${employeeId}`);
}

export async function toggleEmployeeStatusAction(
  employeeId: string,
): Promise<void> {
  const ctx = await requireAdmin();
  const before = await db.employee.findUnique({ where: { id: employeeId } });
  if (!before) return;
  const newStatus = before.status === "active" ? "inactive" : "active";
  await db.employee.update({
    where: { id: employeeId },
    data: { status: newStatus },
  });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "employee_status_changed",
    entityType: "employee",
    entityId: employeeId,
    before: { status: before.status },
    after: { status: newStatus },
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath(`/admin/employees/${employeeId}`);
  revalidatePath("/admin/employees");
}

type ResetPinResult =
  | { ok: true; pinPlain: string }
  | { ok: false; error: string };

export async function resetEmployeePinAction(
  employeeId: string,
): Promise<ResetPinResult> {
  const ctx = await requireAdmin();
  const before = await db.employee.findUnique({ where: { id: employeeId } });
  if (!before) return { ok: false, error: "Employee not found." };

  const pinPlain = generateRandomPin(6);
  const pinHash = await hashPassword(pinPlain);
  await db.employee.update({ where: { id: employeeId }, data: { pinHash } });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "employee_pin_reset",
    entityType: "employee",
    entityId: employeeId,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true, pinPlain };
}

export async function setEmployeePinAction(
  employeeId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireAdmin();
  const parsed = EmployeeSetPinSchema.safeParse({ pin: formData.get("pin") });
  if (!parsed.success) {
    return { ok: false, error: "PIN must be 6 digits." };
  }
  const pinHash = await hashPassword(parsed.data.pin);
  await db.employee.update({ where: { id: employeeId }, data: { pinHash } });
  await audit({
    actor: { type: "user", id: ctx.session.userId! },
    action: "employee_pin_reset",
    entityType: "employee",
    entityId: employeeId,
    sourceIp: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidatePath(`/admin/employees/${employeeId}`);
  return { ok: true };
}
