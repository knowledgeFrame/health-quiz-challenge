import type {
  AssessmentProgress,
  AssessmentResult,
  ProgressPatchInput,
  SubmitAssessmentInput,
} from "./assessment-types";
import { evaluateAssessment } from "./health";

export type SavedAssessmentResult = AssessmentResult & {
  assessmentId: string;
};

export type ResultResponse = {
  sessionId: string;
  subscriptionStatus: "active" | "inactive";
  paywall: {
    required: boolean;
    message?: string;
  };
  result: {
    bmi: number;
    bmiCategory: string;
    summary: string;
    recommendedCalories?: number;
    targetDate?: string;
    predictionCurve?: AssessmentResult["predictionCurve"];
  };
};

export interface AssessmentStore {
  ensureSession(sessionId: string): Promise<void>;
  getProgress(sessionId: string): Promise<AssessmentProgress | null>;
  saveProgress(input: ProgressPatchInput): Promise<AssessmentProgress>;
  saveSubmittedAssessment(
    input: SubmitAssessmentInput,
    result: AssessmentResult,
  ): Promise<SavedAssessmentResult>;
  getResult(sessionId: string): Promise<SavedAssessmentResult | null>;
  isSubscribed(sessionId: string, userId?: string): Promise<boolean>;
  activateSubscription(sessionId: string): Promise<{
    sessionId: string;
    subscriptionStatus: "active";
    paidAt: string;
  }>;
}

export async function getProgress(store: AssessmentStore, sessionId: string) {
  await store.ensureSession(sessionId);
  return (
    (await store.getProgress(sessionId)) ?? {
      sessionId,
      currentStep: 0,
      completed: false,
    }
  );
}

export async function saveProgress(
  store: AssessmentStore,
  input: ProgressPatchInput,
) {
  await store.ensureSession(input.sessionId);
  return store.saveProgress(input);
}

export async function submitAssessment(
  store: AssessmentStore,
  input: SubmitAssessmentInput,
) {
  await store.ensureSession(input.sessionId);
  const result = evaluateAssessment(input);
  return store.saveSubmittedAssessment(input, result);
}

export async function getResult(
  store: AssessmentStore,
  sessionId: string,
  userId?: string,
): Promise<ResultResponse | null> {
  await store.ensureSession(sessionId);
  const result = await store.getResult(sessionId);
  if (!result) return null;

  const isSubscribed = await store.isSubscribed(sessionId, userId);
  const publicResult = {
    bmi: result.bmi,
    bmiCategory: result.bmiCategory,
    summary: result.summary,
  };

  if (!isSubscribed) {
    return {
      sessionId,
      subscriptionStatus: "inactive",
      paywall: {
        required: true,
        message: "Subscribe to unlock calories, target date, and prediction curve.",
      },
      result: publicResult,
    };
  }

  return {
    sessionId,
    subscriptionStatus: "active",
    paywall: {
      required: false,
    },
    result: {
      ...publicResult,
      recommendedCalories: result.recommendedCalories,
      targetDate: result.targetDate,
      predictionCurve: result.predictionCurve,
    },
  };
}

export async function activateSubscription(
  store: AssessmentStore,
  sessionId: string,
) {
  await store.ensureSession(sessionId);
  return store.activateSubscription(sessionId);
}
