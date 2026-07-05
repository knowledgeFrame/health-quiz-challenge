import { NextResponse } from "next/server";

import { submitAssessment } from "@/lib/assessment-service";
import { submitAssessmentSchema } from "@/lib/assessment-types";
import { prismaAssessmentStore } from "@/lib/prisma-assessment-store";

function routeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submitAssessmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid assessment payload",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await submitAssessment(prismaAssessmentStore, parsed.data);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: routeErrorMessage(error) },
      { status: 500 },
    );
  }
}
