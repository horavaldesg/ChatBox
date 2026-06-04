import type { ChatPlatform, UnifiedChatMessage } from "@streamfusion/shared";
import { prisma } from "./db";
import { publishRealtimeMessage } from "./realtime-bus";

export async function deliverMessageToUserOverlays(userId: string, message: UnifiedChatMessage) {
  const overlays = await prisma.overlay.findMany({ where: { userId } });
  for (const overlay of overlays) {
    await prisma.chatMessage.create({
      data: {
        id: `${overlay.id}:${message.id}`,
        overlayId: overlay.id,
        platform: message.platform as ChatPlatform,
        username: message.username,
        displayName: message.displayName,
        avatarUrl: message.avatarUrl,
        message: message.message,
        timestamp: new Date(message.timestamp),
        badges: message.badges
      }
    }).catch(() => undefined);
    publishRealtimeMessage(overlay.id, message);
  }
}
