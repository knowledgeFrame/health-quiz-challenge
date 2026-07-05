import { NextResponse } from "next/server";
import { z } from "zod";

import { activateSubscription } from "@/lib/assessment-service";
import { sessionIdSchema } from "@/lib/assessment-types";
import { prismaAssessmentStore } from "@/lib/prisma-assessment-store";

const paySchema = z.object({
  sessionId: sessionIdSchema,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = paySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const { sessionId } = parsed.data;
  const subscription = await activateSubscription(
    prismaAssessmentStore,
    sessionId,
  );

  return NextResponse.json({
    ok: true,
    ...subscription,
  });
}
