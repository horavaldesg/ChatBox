import { notFound } from "next/navigation";
import { OverlayClient } from "@/components/OverlayClient";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/security";

export default async function OverlayPage({ params, searchParams }: { params: Promise<{ overlayId: string }>; searchParams: Promise<{ token?: string }> }) {
  const { overlayId } = await params;
  const { token = "" } = await searchParams;
  const overlay = await prisma.overlay.findUnique({ where: { id: overlayId }, include: { token: true } });
  if (!overlay?.token || !verifyToken(token, overlay.token.tokenHash)) notFound();
  return <OverlayClient overlay={overlay} token={token} />;
}
