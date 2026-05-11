import { z } from "zod";

export const AdminLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const EmployeeLoginSchema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export const ReauthSchema = z.object({
  password: z.string().min(1),
});
