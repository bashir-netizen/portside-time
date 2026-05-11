import { z } from "zod";
import { isValidIp } from "@/lib/ip";

export const AddIpSchema = z.object({
  ipAddress: z
    .string()
    .min(1)
    .refine(isValidIp, "Enter a valid IPv4 or IPv6 address"),
  label: z.string().min(1).max(80),
});

export const ApproveIpSchema = z.object({
  pendingIpId: z.string().min(1),
  label: z.string().min(1).max(80),
});

export const DismissIpSchema = z.object({
  pendingIpId: z.string().min(1),
  reason: z.string().max(500).default(""),
});
