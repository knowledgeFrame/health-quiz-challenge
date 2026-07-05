import type { Prisma } from "@prisma/client";

import type {
  AssessmentStore,
  SavedAssessmentResult,
} from "./assessment-service";
import {
  fromDbActivityLevel,
  fromDbGender,
  fromDbGoal,
  toDbActivityLevel,
  toDbGender,
  toDbGoal,
  type AssessmentProgress,
  type AssessmentResult,
  type ProgressPatchInput,
} from "./assessment-types";
import { prisma } from "./prisma";

export const prismaAssessmentStore: AssessmentStore = {
  async ensureSession(sessionId) {
    await prisma.session.upsert({
      where: { sessionId },
      update: {},
      create: { sessionId },
    });
  },

  async getProgress(sessionId) {
    const assessment = await prisma.assessment.findUnique({
      where: { sessionId },
    });

    return assessment ? mapAssessment(assessment) : null;
  },

  async saveProgress(input) {
    const data = progressToPrisma(input);
    const assessment = await prisma.assessment.upsert({
      where: { sessionId: input.sessionId },
      update: {
        ...data,
        currentStep: input.step,
      },
      create: {
        sessionId: input.sessionId,
        ...data,
        currentStep: input.step,
      },
    });

    return mapAssessment(assessment);
  },

  async saveSubmittedAssessment(input, result) {
    const assessment = await prisma.assessment.upsert({
      where: { sessionId: input.sessionId },
      update: {
        gender: toDbGender(input.gender),
        goal: toDbGoal(input.goal),
        age: input.age,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        targetWeightKg: input.targetWeightKg,
        activityLevel: toDbActivityLevel(input.activityLevel),
        currentStep: 5,
        completed: true,
      },
      create: {
        sessionId: input.sessionId,
        gender: toDbGender(input.gender),
        goal: toDbGoal(input.goal),
        age: input.age,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        targetWeightKg: input.targetWeightKg,
        activityLevel: toDbActivityLevel(input.activityLevel),
        currentStep: 5,
        completed: true,
      },
    });

    const saved = await prisma.assessmentResult.upsert({
      where: { assessmentId: assessment.id },
      update: resultToPrisma(result),
      create: {
        assessmentId: assessment.id,
        ...resultToPrisma(result),
      },
    });

    return mapResult(saved);
  },

  async getResult(sessionId) {
    const assessment = await prisma.assessment.findUnique({
      where: { sessionId },
      include: { result: true },
    });

    return assessment?.result ? mapResult(assessment.result) : null;
  },

  async isSubscribed(sessionId) {
    const subscription = await prisma.subscription.findUnique({
      where: { sessionId },
    });

    return subscription?.status === "ACTIVE";
  },

  async activateSubscription(sessionId) {
    const subscription = await prisma.subscription.upsert({
      where: { sessionId },
      update: {
        status: "ACTIVE",
        paidAt: new Date(),
      },
      create: {
        sessionId,
        status: "ACTIVE",
        paidAt: new Date(),
      },
    });

    return {
      sessionId,
      subscriptionStatus: "active",
      paidAt: subscription.paidAt?.toISOString() ?? new Date().toISOString(),
    };
  },
};

function progressToPrisma(input: ProgressPatchInput) {
  return {
    ...(input.gender ? { gender: toDbGender(input.gender) } : {}),
    ...(input.goal ? { goal: toDbGoal(input.goal) } : {}),
    ...(typeof input.age === "number" ? { age: input.age } : {}),
    ...(typeof input.heightCm === "number" ? { heightCm: input.heightCm } : {}),
    ...(typeof input.weightKg === "number" ? { weightKg: input.weightKg } : {}),
    ...(typeof input.targetWeightKg === "number"
      ? { targetWeightKg: input.targetWeightKg }
      : {}),
    ...(input.activityLevel
      ? { activityLevel: toDbActivityLevel(input.activityLevel) }
      : {}),
  };
}

function resultToPrisma(result: AssessmentResult) {
  return {
    bmi: result.bmi,
    bmiCategory: result.bmiCategory,
    recommendedCalories: result.recommendedCalories,
    targetDate: new Date(result.targetDate),
    summary: result.summary,
    predictionCurve: result.predictionCurve as unknown as Prisma.JsonArray,
  };
}

function mapAssessment(assessment: {
  sessionId: string;
  gender: string | null;
  goal: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string | null;
  currentStep: number;
  completed: boolean;
}): AssessmentProgress {
  return {
    sessionId: assessment.sessionId,
    ...(assessment.gender ? { gender: fromDbGender(assessment.gender) } : {}),
    ...(assessment.goal ? { goal: fromDbGoal(assessment.goal) } : {}),
    ...(assessment.age ? { age: assessment.age } : {}),
    ...(assessment.heightCm ? { heightCm: assessment.heightCm } : {}),
    ...(assessment.weightKg ? { weightKg: assessment.weightKg } : {}),
    ...(assessment.targetWeightKg
      ? { targetWeightKg: assessment.targetWeightKg }
      : {}),
    ...(assessment.activityLevel
      ? { activityLevel: fromDbActivityLevel(assessment.activityLevel) }
      : {}),
    currentStep: assessment.currentStep,
    completed: assessment.completed,
  };
}

function mapResult(result: {
  assessmentId: string;
  bmi: number;
  bmiCategory: string;
  recommendedCalories: number;
  targetDate: Date;
  summary: string;
  predictionCurve: Prisma.JsonValue;
}): SavedAssessmentResult {
  return {
    assessmentId: result.assessmentId,
    bmi: result.bmi,
    bmiCategory: result.bmiCategory,
    recommendedCalories: result.recommendedCalories,
    targetDate: result.targetDate.toISOString(),
    summary: result.summary,
    predictionCurve: result.predictionCurve as AssessmentResult["predictionCurve"],
  };
}
