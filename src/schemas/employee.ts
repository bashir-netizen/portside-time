import { z } from "zod";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const EmployeeCreateSchema = z.object({
  fullName: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  monthlySalary: z.coerce.number().int().min(0),
  hireDate: z.string().regex(YMD, "Use YYYY-MM-DD"),
  defaultScheduleId: z.string().min(1),
  email: z.string().email().toLowerCase().optional(),
});

// hireDate IS editable here. Changes are captured in the audit log via the
// before/after snapshot in updateEmployeeAction — the spec (§5.2) calls for
// audit logging on hire-date changes, which the existing employee_updated
// audit entry already provides.
export const EmployeeEditSchema = EmployeeCreateSchema;

export const EmployeeSetPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>;
export type EmployeeEditInput = z.infer<typeof EmployeeEditSchema>;
