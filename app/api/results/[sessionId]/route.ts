import { NextResponse } from "next/server";

import { getResult } from "@/lib/assessment-service";
import { sessionIdSchema } from "@/lib/assessment-types";
import { prismaAssessmentStore } from "@/lib/prisma-assessment-store";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const parsed = sessionIdSchema.safeParse(sessionId);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid sessionId is required" },
      { status: 400 },
    );
  }

  const result = await getResult(prismaAssessmentStore, parsed.data);

  if (!result) {
    return NextResponse.json(
      { error: "Assessment result not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
