import { describe, expect, it } from "vitest";

import {
  getAuthenticatedUser,
  loginWithPassword,
  logout,
  type AuthStore,
  type StoredAuthUser,
} from "@/lib/auth-service";

describe("auth service", () => {
  it("creates a password-backed user session and verifies it later", async () => {
    const store = new InMemoryAuthStore();

    const login = await loginWithPassword(store, {
      email: "Member@Example.com",
      password: "correct-password",
      sessionId: "session_12345",
    });

    expect(login.user.email).toBe("member@example.com");
    expect(login.user.subscriptionStatus).toBe("inactive");
    expect(store.boundSessions.get("session_12345")).toBe(login.user.id);

    const user = await getAuthenticatedUser(store, login.token);
    expect(user?.email).toBe("member@example.com");
  });

  it("rejects an incorrect password for an existing account", async () => {
    const store = new InMemoryAuthStore();

    await loginWithPassword(store, {
      email: "member@example.com",
      password: "correct-password",
    });

    await expect(
      loginWithPassword(store, {
        email: "member@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("syncs an active external entitlement into the logged-in user subscription", async () => {
    const store = new InMemoryAuthStore();
    store.externalEntitlements.set("subscriber@example.com", "active");

    const login = await loginWithPassword(store, {
      email: "subscriber@example.com",
      password: "correct-password",
    });

    expect(login.user.subscriptionStatus).toBe("active");
    expect(await store.isUserSubscribed(login.user.id)).toBe(true);

    await logout(store, login.token);
    expect(await getAuthenticatedUser(store, login.token)).toBeNull();
  });
});

class InMemoryAuthStore implements AuthStore {
  users = new Map<string, StoredAuthUser>();
  authSessions = new Map<string, string>();
  userSubscriptions = new Map<string, string>();
  externalEntitlements = new Map<string, string>();
  boundSessions = new Map<string, string>();
  private nextUserId = 1;

  async findUserByEmail(email: string) {
    return this.users.get(email) ?? null;
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    passwordSalt: string;
  }) {
    const user = {
      id: `user_${this.nextUserId++}`,
      ...input,
    };
    this.users.set(user.email, user);
    return user;
  }

  async bindSessionToUser(sessionId: string, userId: string) {
    this.boundSessions.set(sessionId, userId);
  }

  async syncExternalEntitlements(userId: string, email: string) {
    const isActive = this.externalEntitlements.get(email) === "active";
    if (isActive) {
      this.userSubscriptions.set(userId, "active");
    }
    return isActive;
  }

  async isUserSubscribed(userId: string) {
    return this.userSubscriptions.get(userId) === "active";
  }

  async createAuthSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    this.authSessions.set(input.tokenHash, input.userId);
  }

  async getAuthSession(tokenHash: string) {
    const userId = this.authSessions.get(tokenHash);
    if (!userId) return null;
    return (
      [...this.users.values()].find((user) => user.id === userId) ?? null
    );
  }

  async deleteAuthSession(tokenHash: string) {
    this.authSessions.delete(tokenHash);
  }
}
