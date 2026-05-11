import { z } from "zod";

export const LEAVE_TYPES = [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "bereavement",
  "marriage",
  "unpaid",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  maternity: "Maternity",
  paternity: "Paternity",
  bereavement: "Bereavement",
  marriage: "Marriage",
  unpaid: "Unpaid",
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const LeaveRequestSchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: z.string().regex(YMD),
    endDate: z.string().regex(YMD),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const AdminLeaveCreateSchema = LeaveRequestSchema.and(
  z.object({ employeeId: z.string().min(1) }),
);

export const DecideLeaveSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
});

export const HolidaySchema = z.object({
  date: z.string().regex(YMD),
  name: z.string().min(1).max(100),
  isPaid: z.coerce.boolean().default(true),
});
