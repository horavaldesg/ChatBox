import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { overlaySettingsSchema } from "@streamfusion/shared";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ overlayId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { overlayId } = await params;
  const parsed = overlaySettingsSchema.partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = await prisma.overlay.updateMany({
    where: { id: overlayId, userId: session.user.id },
    data: parsed.data
  });
  if (result.count === 0) return NextResponse.json({ error: "Overlay not found." }, { status: 404 });
  const overlay = await prisma.overlay.findUniqueOrThrow({ where: { id: overlayId } });
  await audit(session.user.id, "overlay.updated", { overlayId });
  return NextResponse.json({ overlay });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ overlayId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { overlayId } = await params;
  const result = await prisma.overlay.deleteMany({ where: { id: overlayId, userId: session.user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Overlay not found." }, { status: 404 });
  await audit(session.user.id, "overlay.deleted", { overlayId });
  return NextResponse.json({ ok: true });
}
