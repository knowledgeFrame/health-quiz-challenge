import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    sessionId: body.sessionId,
    subscriptionStatus: "active",
    paidAt: new Date().toISOString(),
  });
}
