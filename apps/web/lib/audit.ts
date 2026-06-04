import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function audit(userId: string | null, action: string, metadata: Record<string, unknown> = {}) {
  await prisma.auditLog.create({ data: { userId, action, metadata: metadata as Prisma.InputJsonValue } });
}
