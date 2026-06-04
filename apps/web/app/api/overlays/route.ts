import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { overlaySettingsSchema } from "@streamfusion/shared";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createPrivateToken, hashToken } from "@/lib/security";
import { overlayUrl } from "@/lib/overlay-url";
import { publicOrigin } from "@/lib/public-origin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const overlays = await prisma.overlay.findMany({
    where: { userId: session.user.id },
    include: { token: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ overlays });
}

export async function POST(request: Request) {
  const origin = publicOrigin(request);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = overlaySettingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const privateToken = createPrivateToken();
  const overlay = await prisma.overlay.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
      token: { create: { tokenHash: hashToken(privateToken) } }
    },
    include: { token: true }
  });
  await audit(session.user.id, "overlay.created", { overlayId: overlay.id });
  return NextResponse.json({ overlay, privateToken, url: overlayUrl(overlay.id, privateToken, origin) });
}
