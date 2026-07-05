import { NextResponse } from "next/server";
import { z } from "zod";

import { emailSchema } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";

const entitlementSyncSchema = z.object({
  email: emailSchema,
  sourcePlatform: z.string().trim().min(2).max(80),
  externalCustomerId: z.string().trim().min(2).max(160).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function POST(request: Request) {
  const secret = process.env.ENTITLEMENT_SYNC_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = entitlementSyncSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid entitlement payload",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const entitlement = await prisma.externalEntitlement.upsert({
    where: {
      email_sourcePlatform: {
        email: parsed.data.email,
        sourcePlatform: parsed.data.sourcePlatform,
      },
    },
    update: {
      externalCustomerId: parsed.data.externalCustomerId,
      status: parsed.data.status,
    },
    create: parsed.data,
  });

  return NextResponse.json({
    ok: true,
    entitlement: {
      email: entitlement.email,
      sourcePlatform: entitlement.sourcePlatform,
      status: entitlement.status,
    },
  });
}
