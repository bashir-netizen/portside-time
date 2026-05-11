import { z } from "zod";

export const AdjustmentSchema = z.object({
  employeeId: z.string().min(1),
  appliesToPeriod: z.string().regex(/^\d{4}-\d{2}-01$/, "Use YYYY-MM-01"),
  amountDjf: z.coerce.number().int(), // positive addition, negative deduction
  reason: z.string().min(5).max(500),
});
