import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authCookieName, getAuthenticatedUser } from "@/lib/auth-service";
import { prismaAuthStore } from "@/lib/prisma-auth-store";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  const user = await getAuthenticatedUser(prismaAuthStore, token);

  return NextResponse.json({ user });
}
