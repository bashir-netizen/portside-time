import { z } from "zod";
import { PUNCH_TYPES } from "@/lib/punch/types";

const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const AddPunchSchema = z.object({
  employeeId: z.string().min(1),
  punchType: z.enum(PUNCH_TYPES),
  punchedAt: z.string().regex(TIME, "Use YYYY-MM-DDTHH:mm"),
  reason: z.string().min(5).max(500),
});

export const EditPunchSchema = z.object({
  punchId: z.string().min(1),
  punchedAt: z.string().regex(TIME),
  reason: z.string().min(5).max(500),
});

export const VoidPunchSchema = z.object({
  punchId: z.string().min(1),
  reason: z.string().min(5).max(500),
});
