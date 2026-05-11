import { z } from "zod";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Day = (typeof DAYS)[number];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export const ScheduleSchema = z
  .object({
    label: z.string().min(1).max(80),
    shiftStart: z.string().regex(TIME, "Use HH:mm"),
    lunchStart: z.string().regex(TIME, "Use HH:mm"),
    lunchEnd: z.string().regex(TIME, "Use HH:mm"),
    shiftEnd: z.string().regex(TIME, "Use HH:mm"),
    workDays: z
      .array(z.enum(DAYS))
      .min(1, "Pick at least one work day"),
  })
  .superRefine((val, ctx) => {
    const a = timeToMinutes(val.shiftStart);
    const b = timeToMinutes(val.lunchStart);
    const c = timeToMinutes(val.lunchEnd);
    const d = timeToMinutes(val.shiftEnd);
    if (!(a < b && b < c && c < d)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Times must satisfy: shift start < lunch start < lunch end < shift end",
        path: ["shiftEnd"],
      });
    }
  });

export type ScheduleInput = z.infer<typeof ScheduleSchema>;
