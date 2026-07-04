import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureSession } from "@/lib/session";

const paySchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
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
  await ensureSession(sessionId);

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

  return NextResponse.json({
    ok: true,
    sessionId,
    subscriptionStatus: subscription.status.toLowerCase(),
    paidAt: subscription.paidAt?.toISOString(),
  });
}
