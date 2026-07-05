import { z } from "zod";
import type {
  ActivityLevel as DbActivityLevel,
  Gender as DbGender,
  Goal as DbGoal,
} from "@prisma/client";

export const stepKeys = [
  "gender",
  "goal",
  "body",
  "target",
  "activity",
] as const;

export const genderSchema = z.enum(["female", "male", "other"]);
export const goalSchema = z.enum(["lose_weight", "maintain", "build_muscle"]);
export const activityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const sessionIdSchema = z
  .string()
  .trim()
  .min(8, "sessionId must be at least 8 characters")
  .max(120, "sessionId is too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "sessionId contains unsupported characters");

export const progressPatchSchema = z
  .object({
    sessionId: sessionIdSchema,
    step: z.number().int().min(0).max(stepKeys.length),
    gender: genderSchema.optional(),
    goal: goalSchema.optional(),
    age: z.number().int().min(13).max(100).optional(),
    heightCm: z.number().min(120).max(230).optional(),
    weightKg: z.number().min(35).max(250).optional(),
    targetWeightKg: z.number().min(35).max(250).optional(),
    activityLevel: activityLevelSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      typeof data.weightKg === "number" &&
      typeof data.targetWeightKg === "number"
    ) {
      validateTargetWeight(data.weightKg, data.targetWeightKg, data.goal, ctx);
    }
  });

export const submitAssessmentSchema = z
  .object({
    sessionId: sessionIdSchema,
    gender: genderSchema,
    goal: goalSchema,
    age: z.number().int().min(13).max(100),
    heightCm: z.number().min(120).max(230),
    weightKg: z.number().min(35).max(250),
    targetWeightKg: z.number().min(35).max(250),
    activityLevel: activityLevelSchema,
  })
  .superRefine((data, ctx) => {
    validateTargetWeight(data.weightKg, data.targetWeightKg, data.goal, ctx);
  });

function validateTargetWeight(
  weightKg: number,
  targetWeightKg: number,
  goal: z.infer<typeof goalSchema> | undefined,
  ctx: z.RefinementCtx,
) {
  if (Math.abs(weightKg - targetWeightKg) > 70) {
    ctx.addIssue({
      code: "custom",
      path: ["targetWeightKg"],
      message: "targetWeightKg is too far from current weight",
    });
  }

  if (goal === "lose_weight" && targetWeightKg >= weightKg) {
    ctx.addIssue({
      code: "custom",
      path: ["targetWeightKg"],
      message: "targetWeightKg must be lower than current weight",
    });
  }

  if (goal === "build_muscle" && targetWeightKg <= weightKg) {
    ctx.addIssue({
      code: "custom",
      path: ["targetWeightKg"],
      message: "targetWeightKg must be higher than current weight",
    });
  }
}

export type Gender = z.infer<typeof genderSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type ActivityLevel = z.infer<typeof activityLevelSchema>;
export type ProgressPatchInput = z.infer<typeof progressPatchSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

export type AssessmentProgress = Partial<
  Omit<SubmitAssessmentInput, "sessionId">
> & {
  sessionId: string;
  currentStep: number;
  completed: boolean;
};

export type PredictionPoint = {
  week: number;
  weightKg: number;
  calories: number;
};

export type AssessmentResult = {
  bmi: number;
  bmiCategory: string;
  recommendedCalories: number;
  targetDate: string;
  summary: string;
  predictionCurve: PredictionPoint[];
};

export function toDbGender(gender: Gender) {
  return gender.toUpperCase() as DbGender;
}

export function fromDbGender(gender: string | null | undefined) {
  return gender?.toLowerCase() as Gender | undefined;
}

export function toDbGoal(goal: Goal) {
  return goal.toUpperCase() as DbGoal;
}

export function fromDbGoal(goal: string | null | undefined) {
  return goal?.toLowerCase() as Goal | undefined;
}

export function toDbActivityLevel(activityLevel: ActivityLevel) {
  return activityLevel.toUpperCase() as DbActivityLevel;
}

export function fromDbActivityLevel(activityLevel: string | null | undefined) {
  return activityLevel?.toLowerCase() as ActivityLevel | undefined;
}
