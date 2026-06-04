import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { oauthConfig, refreshProviderToken } from "@/lib/oauth";

export async function POST(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await params;
  if (provider !== "twitch" && provider !== "kick") return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  const config = oauthConfig[provider];
  const account = await prisma.connectedAccount.findFirst({ where: { userId: session.user.id, provider: config.platform } });
  if (!account?.encryptedRefreshToken) return NextResponse.json({ error: "Refresh token is not available." }, { status: 400 });
  const refreshed = await refreshProviderToken(provider, account.encryptedRefreshToken);
  await prisma.connectedAccount.update({ where: { id: account.id }, data: refreshed });
  await audit(session.user.id, "provider.token_refreshed", { provider });
  return NextResponse.json({ ok: true, expiresAt: refreshed.expiresAt });
}
