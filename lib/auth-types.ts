import { z } from "zod";

import { sessionIdSchema } from "./assessment-types";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "password must be at least 8 characters")
  .max(160, "password is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  sessionId: sessionIdSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSessionUser = AuthUser & {
  subscriptionStatus: "active" | "inactive";
};
