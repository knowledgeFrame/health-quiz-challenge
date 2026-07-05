import { describe, expect, it } from "vitest";

import {
  activateSubscription,
  getProgress,
  getResult,
  saveProgress,
  submitAssessment,
  type AssessmentStore,
  type SavedAssessmentResult,
} from "@/lib/assessment-service";
import type {
  AssessmentProgress,
  AssessmentResult,
  ProgressPatchInput,
  SubmitAssessmentInput,
} from "@/lib/assessment-types";
import { progressPatchSchema, submitAssessmentSchema } from "@/lib/assessment-types";

const completeAssessment: SubmitAssessmentInput = {
  sessionId: "flow_session_123",
  gender: "male",
  goal: "lose_weight",
  age: 36,
  heightCm: 178,
  weightKg: 84,
  targetWeightKg: 76,
  activityLevel: "active",
};

describe("assessment service flow", () => {
  it("saves repeated and out-of-order progress patches, then restores latest state", async () => {
    const store = new InMemoryAssessmentStore();

    await saveProgress(store, {
      sessionId: completeAssessment.sessionId,
      step: 2,
      age: 36,
      heightCm: 178,
      weightKg: 84,
    });
    await saveProgress(store, {
      sessionId: completeAssessment.sessionId,
      step: 1,
      goal: "lose_weight",
    });
    await saveProgress(store, {
      sessionId: completeAssessment.sessionId,
      step: 2,
      age: 37,
    });

    const progress = await getProgress(store, completeAssessment.sessionId);

    expect(progress).toMatchObject({
      sessionId: completeAssessment.sessionId,
      currentStep: 2,
      age: 37,
      goal: "lose_weight",
      weightKg: 84,
      completed: false,
    });
  });

  it("masks protected result fields before payment and unlocks them after /pay", async () => {
    const store = new InMemoryAssessmentStore();

    await submitAssessment(store, completeAssessment);
    const preview = await getResult(store, completeAssessment.sessionId);

    expect(preview?.subscriptionStatus).toBe("inactive");
    expect(preview?.paywall.required).toBe(true);
    expect(preview?.result.bmi).toBeDefined();
    expect(preview?.result.recommendedCalories).toBeUndefined();
    expect(preview?.result.predictionCurve).toBeUndefined();

    const payment = await activateSubscription(store, completeAssessment.sessionId);
    const full = await getResult(store, completeAssessment.sessionId);

    expect(payment.subscriptionStatus).toBe("active");
    expect(full?.subscriptionStatus).toBe("active");
    expect(full?.paywall.required).toBe(false);
    expect(full?.result.recommendedCalories).toBeGreaterThan(1200);
    expect(full?.result.predictionCurve?.length).toBeGreaterThan(0);
  });

  it("validates illegal input payloads before they reach persistence", () => {
    expect(
      progressPatchSchema.safeParse({
        sessionId: "bad",
        step: 99,
        age: 8,
        heightCm: 900,
      }).success,
    ).toBe(false);

    expect(
      submitAssessmentSchema.safeParse({
        ...completeAssessment,
        targetWeightKg: 95,
      }).success,
    ).toBe(false);
  });

  it("handles concurrent progress updates without creating duplicate sessions", async () => {
    const store = new InMemoryAssessmentStore();

    await Promise.all([
      saveProgress(store, {
        sessionId: completeAssessment.sessionId,
        step: 1,
        goal: "lose_weight",
      }),
      saveProgress(store, {
        sessionId: completeAssessment.sessionId,
        step: 0,
        gender: "male",
      }),
      saveProgress(store, {
        sessionId: completeAssessment.sessionId,
        step: 4,
        activityLevel: "active",
      }),
    ]);

    const progress = await getProgress(store, completeAssessment.sessionId);

    expect(store.sessionCount).toBe(1);
    expect(progress).toMatchObject({
      gender: "male",
      goal: "lose_weight",
      activityLevel: "active",
    });
  });
});

class InMemoryAssessmentStore implements AssessmentStore {
  private sessions = new Set<string>();
  private progress = new Map<string, AssessmentProgress>();
  private results = new Map<string, SavedAssessmentResult>();
  private subscriptions = new Map<string, string>();

  get sessionCount() {
    return this.sessions.size;
  }

  async ensureSession(sessionId: string) {
    this.sessions.add(sessionId);
  }

  async getProgress(sessionId: string) {
    return this.progress.get(sessionId) ?? null;
  }

  async saveProgress(input: ProgressPatchInput) {
    const previous = this.progress.get(input.sessionId) ?? {
      sessionId: input.sessionId,
      currentStep: 0,
      completed: false,
    };
    const next = {
      ...previous,
      ...withoutUndefined({
        gender: input.gender,
        goal: input.goal,
        age: input.age,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        targetWeightKg: input.targetWeightKg,
        activityLevel: input.activityLevel,
      }),
      currentStep: Math.max(previous.currentStep, input.step),
      completed: false,
    };

    this.progress.set(input.sessionId, next);
    return next;
  }

  async saveSubmittedAssessment(
    input: SubmitAssessmentInput,
    result: AssessmentResult,
  ) {
    this.progress.set(input.sessionId, {
      sessionId: input.sessionId,
      gender: input.gender,
      goal: input.goal,
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      targetWeightKg: input.targetWeightKg,
      activityLevel: input.activityLevel,
      currentStep: 5,
      completed: true,
    });

    const saved = {
      ...result,
      assessmentId: `assessment_${input.sessionId}`,
    };
    this.results.set(input.sessionId, saved);
    return saved;
  }

  async getResult(sessionId: string) {
    return this.results.get(sessionId) ?? null;
  }

  async isSubscribed(sessionId: string) {
    return this.subscriptions.get(sessionId) === "active";
  }

  async activateSubscription(sessionId: string) {
    const paidAt = new Date().toISOString();
    this.subscriptions.set(sessionId, "active");
    return {
      sessionId,
      subscriptionStatus: "active" as const,
      paidAt,
    };
  }
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
