import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createPrivateToken, hashToken } from "@/lib/security";
import { overlayUrl } from "@/lib/overlay-url";

export async function POST(_: Request, { params }: { params: Promise<{ overlayId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { overlayId } = await params;
  const overlay = await prisma.overlay.findFirst({ where: { id: overlayId, userId: session.user.id } });
  if (!overlay) return NextResponse.json({ error: "Overlay not found." }, { status: 404 });
  const privateToken = createPrivateToken();
  await prisma.overlayToken.upsert({
    where: { overlayId },
    update: { tokenHash: hashToken(privateToken) },
    create: { overlayId, tokenHash: hashToken(privateToken) }
  });
  await audit(session.user.id, "overlay_token.regenerated", { overlayId });
  return NextResponse.json({ privateToken, url: overlayUrl(overlayId, privateToken) });
}
