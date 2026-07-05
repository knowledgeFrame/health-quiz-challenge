import { NextResponse } from "next/server";

import { prismaAssessmentStore } from "@/lib/prisma-assessment-store";

export async function POST() {
  const sessionId = crypto.randomUUID();
  await prismaAssessmentStore.ensureSession(sessionId);

  return NextResponse.json({
    sessionId,
  });
}
