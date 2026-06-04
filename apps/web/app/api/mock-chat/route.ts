import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publishRealtimeMessage } from "@/lib/realtime-bus";
import { audit } from "@/lib/audit";
import type { UnifiedChatMessage } from "@streamfusion/shared";

const schema = z.object({
  overlayId: z.string().min(1),
  platform: z.enum(["TWITCH", "KICK", "X", "MOCK"]).default("MOCK"),
  displayName: z.string().min(1).max(80).default("Mock Viewer"),
  username: z.string().min(1).max(80).default("mock_viewer"),
  message: z.string().min(1).max(500),
  badges: z.array(z.string().min(1).max(32)).max(5).default([])
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const overlay = await prisma.overlay.findFirst({
    where: { id: parsed.data.overlayId, userId: session.user.id }
  });
  if (!overlay) return NextResponse.json({ error: "Overlay not found." }, { status: 404 });

  const message: UnifiedChatMessage = {
    id: randomUUID(),
    platform: parsed.data.platform,
    username: parsed.data.username.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    displayName: parsed.data.displayName,
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(parsed.data.displayName)}`,
    message: parsed.data.message,
    timestamp: new Date().toISOString(),
    badges: parsed.data.badges
  };

  await prisma.chatMessage.create({
    data: {
      id: `${overlay.id}:${message.id}`,
      overlayId: overlay.id,
      platform: message.platform,
      username: message.username,
      displayName: message.displayName,
      avatarUrl: message.avatarUrl,
      message: message.message,
      timestamp: new Date(message.timestamp),
      badges: message.badges
    }
  });
  const delivered = publishRealtimeMessage(overlay.id, message);
  await audit(session.user.id, "mock_chat.sent", { overlayId: overlay.id, delivered });
  return NextResponse.json({ ok: true, delivered, message });
}
