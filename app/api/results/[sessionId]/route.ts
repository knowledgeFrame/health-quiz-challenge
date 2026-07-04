import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ensureSession } from "@/lib/session";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  await ensureSession(sessionId);

  const subscription = await prisma.subscription.findUnique({
    where: { sessionId },
  });

  const isActive = subscription?.status === "ACTIVE";
  const publicResult = {
    bmi: 24.2,
    category: "normal",
    summary: "Your initial health profile is ready.",
  };

  if (!isActive) {
    return NextResponse.json({
      sessionId,
      subscriptionStatus: "inactive",
      paywall: {
        required: true,
        message: "Subscribe to unlock your full prediction curve.",
      },
      result: publicResult,
    });
  }

  return NextResponse.json({
    sessionId,
    subscriptionStatus: "active",
    paywall: {
      required: false,
    },
    result: {
      ...publicResult,
      recommendedCalories: 1840,
      targetDate: "2026-09-16",
      predictionCurve: [
        { week: 1, weightKg: 72.4 },
        { week: 2, weightKg: 71.8 },
        { week: 3, weightKg: 71.2 },
      ],
    },
  });
}
