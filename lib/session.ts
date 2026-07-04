import { prisma } from "./prisma";

export async function ensureSession(sessionId: string) {
  return prisma.session.upsert({
    where: { sessionId },
    update: {},
    create: { sessionId },
  });
}
