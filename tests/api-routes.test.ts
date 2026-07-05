import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type {
  AssessmentProgress,
  AssessmentResult,
  ProgressPatchInput,
  SubmitAssessmentInput,
} from "@/lib/assessment-types";
import type { SavedAssessmentResult } from "@/lib/assessment-service";

const mockStoreState = vi.hoisted(() => ({
  sessions: new Set<string>(),
  sessionUsers: new Map<string, string>(),
  progress: new Map<string, AssessmentProgress>(),
  results: new Map<string, SavedAssessmentResult>(),
  subscriptions: new Map<string, string>(),
  userSubscriptions: new Map<string, string>(),
  syncedEntitlements: new Map<string, { email: string; sourcePlatform: string; status: string }>(),
  authUserId: null as string | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mockStoreState.authUserId ? { value: "test-token" } : undefined),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-service")>();
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(async () =>
      mockStoreState.authUserId
        ? {
            id: mockStoreState.authUserId,
            email: "subscriber@example.com",
            subscriptionStatus: "active",
          }
        : null,
    ),
  };
});

vi.mock("@/lib/prisma-auth-store", () => ({
  prismaAuthStore: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    externalEntitlement: {
      async upsert(input: {
        where: { email_sourcePlatform: { email: string; sourcePlatform: string } };
        update: { status: string };
        create: { email: string; sourcePlatform: string; status: string };
      }) {
        const key = `${input.where.email_sourcePlatform.email}:${input.where.email_sourcePlatform.sourcePlatform}`;
        const entitlement = {
          email: input.where.email_sourcePlatform.email,
          sourcePlatform: input.where.email_sourcePlatform.sourcePlatform,
          status: input.update.status ?? input.create.status,
        };
        mockStoreState.syncedEntitlements.set(key, entitlement);
        return entitlement;
      },
    },
  },
}));

vi.mock("@/lib/prisma-assessment-store", () => ({
  prismaAssessmentStore: {
    async ensureSession(sessionId: string) {
      mockStoreState.sessions.add(sessionId);
    },
    async getProgress(sessionId: string) {
      return mockStoreState.progress.get(sessionId) ?? null;
    },
    async saveProgress(input: ProgressPatchInput) {
      const previous = mockStoreState.progress.get(input.sessionId) ?? {
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
      mockStoreState.progress.set(input.sessionId, next);
      return next;
    },
    async saveSubmittedAssessment(
      input: SubmitAssessmentInput,
      result: AssessmentResult,
    ) {
      mockStoreState.progress.set(input.sessionId, {
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
      mockStoreState.results.set(input.sessionId, saved);
      return saved;
    },
    async getResult(sessionId: string) {
      return mockStoreState.results.get(sessionId) ?? null;
    },
    async isSubscribed(sessionId: string, userId?: string) {
      return (
        mockStoreState.subscriptions.get(sessionId) === "active" ||
        Boolean(userId && mockStoreState.userSubscriptions.get(userId) === "active")
      );
    },
    async activateSubscription(sessionId: string) {
      const paidAt = new Date().toISOString();
      mockStoreState.subscriptions.set(sessionId, "active");
      const userId = mockStoreState.sessionUsers.get(sessionId);
      if (userId) {
        mockStoreState.userSubscriptions.set(userId, "active");
      }
      return {
        sessionId,
        subscriptionStatus: "active" as const,
        paidAt,
      };
    },
  },
}));

const validAssessment: SubmitAssessmentInput = {
  sessionId: "route_session_123",
  gender: "female",
  goal: "lose_weight",
  age: 34,
  heightCm: 166,
  weightKg: 74,
  targetWeightKg: 66,
  activityLevel: "moderate",
};

describe("API route handlers", () => {
  beforeEach(() => {
    mockStoreState.sessions.clear();
    mockStoreState.sessionUsers.clear();
    mockStoreState.progress.clear();
    mockStoreState.results.clear();
    mockStoreState.subscriptions.clear();
    mockStoreState.userSubscriptions.clear();
    mockStoreState.syncedEntitlements.clear();
    mockStoreState.authUserId = null;
  });

  it("rejects illegal progress and assessment payloads before persistence", async () => {
    const { PATCH } = await import("@/app/api/assessment/progress/route");
    const { POST: submitPost } = await import("@/app/api/assessment/submit/route");

    const invalidProgressPayloads = [
      { sessionId: "bad spaces", step: 1 },
      { sessionId: validAssessment.sessionId, step: 99 },
      { sessionId: validAssessment.sessionId, step: 1, age: 12 },
      { sessionId: validAssessment.sessionId, step: 1, age: "34" },
      { sessionId: validAssessment.sessionId, step: 1, heightCm: 900 },
      { sessionId: validAssessment.sessionId, step: 1, weightKg: 10 },
      { sessionId: validAssessment.sessionId, step: 1, activityLevel: "injected" },
    ];

    for (const payload of invalidProgressPayloads) {
      const response = await PATCH(jsonRequest("/api/assessment/progress", payload));
      expect(response.status).toBe(400);
    }

    const invalidSubmitPayloads = [
      { ...validAssessment, age: 8 },
      { ...validAssessment, heightCm: 119 },
      { ...validAssessment, weightKg: 251 },
      { ...validAssessment, targetWeightKg: 95 },
      { ...validAssessment, goal: "drop_tables" },
      { ...validAssessment, activityLevel: undefined },
    ];

    for (const payload of invalidSubmitPayloads) {
      const response = await submitPost(jsonRequest("/api/assessment/submit", payload));
      expect(response.status).toBe(400);
    }

    expect(mockStoreState.progress.size).toBe(0);
    expect(mockStoreState.results.size).toBe(0);
  });

  it("saves progress, restores it, masks unpaid results, then unlocks them after /pay", async () => {
    const { PATCH, GET: progressGet } = await import("@/app/api/assessment/progress/route");
    const { POST: submitPost } = await import("@/app/api/assessment/submit/route");
    const { GET: resultGet } = await import("@/app/api/results/[sessionId]/route");
    const { POST: payPost } = await import("@/app/api/pay/route");

    await PATCH(
      jsonRequest("/api/assessment/progress", {
        sessionId: validAssessment.sessionId,
        step: 2,
        age: 33,
        heightCm: 166,
      }),
    );
    await PATCH(
      jsonRequest("/api/assessment/progress", {
        sessionId: validAssessment.sessionId,
        step: 1,
        goal: "lose_weight",
      }),
    );
    await PATCH(
      jsonRequest("/api/assessment/progress", {
        sessionId: validAssessment.sessionId,
        step: 2,
        age: 34,
      }),
    );

    const restored = await progressGet(
      new NextRequest(
        `http://localhost/api/assessment/progress?sessionId=${validAssessment.sessionId}`,
      ),
    );
    const restoredBody = await restored.json();

    expect(restored.status).toBe(200);
    expect(restoredBody.progress).toMatchObject({
      sessionId: validAssessment.sessionId,
      currentStep: 2,
      age: 34,
      goal: "lose_weight",
    });

    const submitResponse = await submitPost(
      jsonRequest("/api/assessment/submit", validAssessment),
    );
    expect(submitResponse.status).toBe(200);

    const unpaidResponse = await resultGet(new Request("http://localhost/api/results"), {
      params: Promise.resolve({ sessionId: validAssessment.sessionId }),
    });
    const unpaid = await unpaidResponse.json();

    expect(unpaidResponse.status).toBe(200);
    expect(unpaid.subscriptionStatus).toBe("inactive");
    expect(unpaid.paywall.required).toBe(true);
    expect(unpaid.result.bmi).toBeDefined();
    expect(unpaid.result.recommendedCalories).toBeUndefined();
    expect(unpaid.result.targetDate).toBeUndefined();
    expect(unpaid.result.predictionCurve).toBeUndefined();

    const payResponse = await payPost(
      jsonRequest("/api/pay", { sessionId: validAssessment.sessionId }),
    );
    const payment = await payResponse.json();
    expect(payResponse.status).toBe(200);
    expect(payment.subscriptionStatus).toBe("active");

    const paidResponse = await resultGet(new Request("http://localhost/api/results"), {
      params: Promise.resolve({ sessionId: validAssessment.sessionId }),
    });
    const paid = await paidResponse.json();

    expect(paidResponse.status).toBe(200);
    expect(paid.subscriptionStatus).toBe("active");
    expect(paid.paywall.required).toBe(false);
    expect(paid.result.recommendedCalories).toBeGreaterThan(1200);
    expect(paid.result.targetDate).toBeDefined();
    expect(paid.result.predictionCurve.length).toBeGreaterThan(0);
  });

  it("unlocks protected result fields for a logged-in user with an existing subscription", async () => {
    const { POST: submitPost } = await import("@/app/api/assessment/submit/route");
    const { GET: resultGet } = await import("@/app/api/results/[sessionId]/route");

    await submitPost(jsonRequest("/api/assessment/submit", validAssessment));

    mockStoreState.authUserId = "user_existing_subscriber";
    mockStoreState.userSubscriptions.set("user_existing_subscriber", "active");

    const response = await resultGet(new Request("http://localhost/api/results"), {
      params: Promise.resolve({ sessionId: validAssessment.sessionId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscriptionStatus).toBe("active");
    expect(body.paywall.required).toBe(false);
    expect(body.result.recommendedCalories).toBeGreaterThan(1200);
    expect(body.result.predictionCurve.length).toBeGreaterThan(0);
  });

  it("syncs external platform entitlements only with the configured secret", async () => {
    const { POST } = await import("@/app/api/entitlements/sync/route");

    process.env.ENTITLEMENT_SYNC_SECRET = "sync-secret";

    const rejected = await POST(
      jsonRequest("/api/entitlements/sync", {
        email: "subscriber@example.com",
        sourcePlatform: "stripe",
        status: "ACTIVE",
      }),
    );
    expect(rejected.status).toBe(401);

    const accepted = await POST(
      jsonRequest(
        "/api/entitlements/sync",
        {
          email: "subscriber@example.com",
          sourcePlatform: "stripe",
          externalCustomerId: "cus_123",
          status: "ACTIVE",
        },
        { authorization: "Bearer sync-secret" },
      ),
    );
    const body = await accepted.json();

    expect(accepted.status).toBe(200);
    expect(body.entitlement).toMatchObject({
      email: "subscriber@example.com",
      sourcePlatform: "stripe",
      status: "ACTIVE",
    });
    expect(mockStoreState.syncedEntitlements.size).toBe(1);
  });
});

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
