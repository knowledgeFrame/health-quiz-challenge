import { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } from "node:crypto";

import type { AuthSessionUser, AuthUser, LoginInput } from "./auth-types";

const passwordIterations = 120_000;
const passwordKeyLength = 32;
const authSessionDays = 30;

export const authCookieName = "health_quiz_auth";

export type StoredAuthUser = AuthUser & {
  passwordHash: string;
  passwordSalt: string;
};

export interface AuthStore {
  findUserByEmail(email: string): Promise<StoredAuthUser | null>;
  createUser(input: {
    email: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<StoredAuthUser>;
  bindSessionToUser(sessionId: string, userId: string): Promise<void>;
  syncExternalEntitlements(userId: string, email: string): Promise<boolean>;
  isUserSubscribed(userId: string): Promise<boolean>;
  createAuthSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  getAuthSession(tokenHash: string): Promise<AuthUser | null>;
  deleteAuthSession(tokenHash: string): Promise<void>;
}

export async function loginWithPassword(
  store: AuthStore,
  input: LoginInput,
) {
  const email = input.email.trim().toLowerCase();
  const existing = await store.findUserByEmail(email);
  const user =
    existing ??
    (await store.createUser({
      email,
      ...hashPassword(input.password),
    }));

  if (existing && !verifyPassword(input.password, existing)) {
    throw new Error("Invalid email or password");
  }

  if (input.sessionId) {
    await store.bindSessionToUser(input.sessionId, user.id);
  }

  await store.syncExternalEntitlements(user.id, user.email);
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + authSessionDays * 24 * 60 * 60 * 1000);

  await store.createAuthSession({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const subscriptionStatus = (await store.isUserSubscribed(user.id))
    ? "active"
    : "inactive";

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      subscriptionStatus,
    } satisfies AuthSessionUser,
  };
}

export async function getAuthenticatedUser(
  store: AuthStore,
  token: string | undefined,
): Promise<AuthSessionUser | null> {
  if (!token) return null;

  const user = await store.getAuthSession(hashSessionToken(token));
  if (!user) return null;

  return {
    ...user,
    subscriptionStatus: (await store.isUserSubscribed(user.id))
      ? "active"
      : "inactive",
  };
}

export async function logout(store: AuthStore, token: string | undefined) {
  if (!token) return;
  await store.deleteAuthSession(hashSessionToken(token));
}

export function hashPassword(password: string) {
  const passwordSalt = randomBytes(16).toString("base64url");
  const passwordHash = derivePasswordHash(password, passwordSalt);
  return { passwordHash, passwordSalt };
}

function verifyPassword(password: string, user: StoredAuthUser) {
  const inputHash = Buffer.from(
    derivePasswordHash(password, user.passwordSalt),
    "base64url",
  );
  const storedHash = Buffer.from(user.passwordHash, "base64url");

  return (
    inputHash.length === storedHash.length && timingSafeEqual(inputHash, storedHash)
  );
}

function derivePasswordHash(password: string, salt: string) {
  return pbkdf2Sync(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    "sha256",
  ).toString("base64url");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}
