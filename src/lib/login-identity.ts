import { z } from "zod";

export function loginAlias(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return `email:${trimmed.toLowerCase()}`;
  if (/^\+?[0-9 ()-]+$/.test(trimmed)) return `phone:${trimmed.replace(/\D/g, "")}`;
  return `id:${trimmed.toLowerCase()}`;
}
export const customerLoginSchema = z.object({
  customerId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/).refine(v => v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  address: z.string().trim().max(500),
  loginId: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9._-]{2,31}$/, "Login ID must start with a letter and contain 3–32 letters, numbers, dots, hyphens or underscores."),
  password: z.string().min(8).max(128),
});
export type CustomerLoginInput = z.input<typeof customerLoginSchema>;