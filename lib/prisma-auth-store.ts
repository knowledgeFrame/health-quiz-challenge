import type { AuthStore } from "./auth-service";
import { prisma } from "./prisma";

export const prismaAuthStore: AuthStore = {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        passwordSalt: true,
      },
    });
  },

  async createUser(input) {
    return prisma.user.create({
      data: input,
      select: {
        id: true,
        email: true,
        passwordHash: true,
        passwordSalt: true,
      },
    });
  },

  async bindSessionToUser(sessionId, userId) {
    await prisma.session.upsert({
      where: { sessionId },
      update: { userId },
      create: { sessionId, userId },
    });
  },

  async syncExternalEntitlements(userId, email) {
    const entitlement = await prisma.externalEntitlement.findFirst({
      where: {
        email,
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!entitlement) return false;

    await prisma.externalEntitlement.update({
      where: { id: entitlement.id },
      data: { userId },
    });

    await prisma.subscription.upsert({
      where: {
        externalSubscriptionId:
          entitlement.externalCustomerId ?? `external:${entitlement.id}`,
      },
      update: {
        userId,
        status: "ACTIVE",
        sourcePlatform: entitlement.sourcePlatform,
        paidAt: new Date(),
      },
      create: {
        userId,
        status: "ACTIVE",
        sourcePlatform: entitlement.sourcePlatform,
        externalSubscriptionId:
          entitlement.externalCustomerId ?? `external:${entitlement.id}`,
        paidAt: new Date(),
      },
    });

    return true;
  },

  async isUserSubscribed(userId) {
    const [subscription, entitlement] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
      }),
      prisma.externalEntitlement.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
      }),
    ]);

    return Boolean(subscription || entitlement);
  },

  async createAuthSession(input) {
    await prisma.authSession.create({
      data: input,
    });
  },

  async getAuthSession(tokenHash) {
    const session = await prisma.authSession.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return session?.user ?? null;
  },

  async deleteAuthSession(tokenHash) {
    await prisma.authSession.deleteMany({
      where: { tokenHash },
    });
  },
};
