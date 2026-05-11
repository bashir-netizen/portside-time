import { z } from "zod";

export const RegisterDeviceSchema = z.object({
  label: z.string().min(1).max(80),
  visitorId: z.string().min(8).max(200),
  userAgent: z.string().max(500).default(""),
  screenResolution: z.string().regex(/^\d+x\d+$/).optional(),
});

export const RevokeDeviceSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const RelabelDeviceSchema = z.object({
  label: z.string().min(1).max(80),
});
