import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deliverMessageToUserOverlays } from "@/lib/chat-delivery";
import { normalizeKickWebhookMessage, verifyKickSignature } from "@/lib/kick-events";

export async function POST(request: Request) {
  const eventType = request.headers.get("kick-event-type");
  const rawBody = await request.text();
  if (!verifyKickSignature(rawBody, request.headers)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  if (eventType !== "chat.message.sent") return NextResponse.json({ ok: true, ignored: true });

  const payload = JSON.parse(rawBody);
  const broadcasterUserId = payload?.broadcaster?.user_id ? String(payload.broadcaster.user_id) : "";
  const account = await prisma.connectedAccount.findFirst({
    where: { provider: "KICK", providerAccountId: broadcasterUserId },
    select: { userId: true }
  });
  if (!account) return NextResponse.json({ ok: true, ignored: true });

  await deliverMessageToUserOverlays(account.userId, normalizeKickWebhookMessage(payload));
  return NextResponse.json({ ok: true });
}
