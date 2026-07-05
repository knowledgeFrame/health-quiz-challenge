import { NextResponse } from "next/server";

import { loginWithPassword, authCookieName } from "@/lib/auth-service";
import { loginSchema } from "@/lib/auth-types";
import { prismaAuthStore } from "@/lib/prisma-auth-store";

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid login payload",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const login = await loginWithPassword(prismaAuthStore, parsed.data);
    const response = NextResponse.json({
      user: login.user,
    });

    response.cookies.set({
      name: authCookieName,
      value: login.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: login.expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }
}
