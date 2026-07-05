import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authCookieName, logout } from "@/lib/auth-service";
import { prismaAuthStore } from "@/lib/prisma-auth-store";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  await logout(prismaAuthStore, token);
  cookieStore.delete(authCookieName);

  return NextResponse.json({ ok: true });
}
