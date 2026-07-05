import { NextRequest, NextResponse } from "next/server";

import {
  getProgress,
  saveProgress,
} from "@/lib/assessment-service";
import {
  progressPatchSchema,
  sessionIdSchema,
} from "@/lib/assessment-types";
import { prismaAssessmentStore } from "@/lib/prisma-assessment-store";

export async function GET(request: NextRequest) {
  const parsed = sessionIdSchema.safeParse(
    request.nextUrl.searchParams.get("sessionId"),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid sessionId is required" },
      { status: 400 },
    );
  }

  const progress = await getProgress(prismaAssessmentStore, parsed.data);
  return NextResponse.json({ progress });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = progressPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid progress payload",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const progress = await saveProgress(prismaAssessmentStore, parsed.data);
  return NextResponse.json({ progress });
}
