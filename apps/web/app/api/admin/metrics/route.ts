import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isAdmin(email?: string | null): boolean {
  return (process.env.ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).includes((email || "").toLowerCase());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [users, overlays, connectedAccounts, chatMessages] = await Promise.all([
    prisma.user.count(),
    prisma.overlay.count(),
    prisma.connectedAccount.count(),
    prisma.chatMessage.count()
  ]);
  return NextResponse.json({ users, overlays, connectedAccounts, chatMessages });
}
