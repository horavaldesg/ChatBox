import { DashboardClient } from "@/components/DashboardClient";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function isAdmin(email?: string | null): boolean {
  return (process.env.ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).includes((email || "").toLowerCase());
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [overlays, accounts, metrics] = await Promise.all([
    prisma.overlay.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.connectedAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    isAdmin(user.email)
      ? Promise.all([prisma.user.count(), prisma.overlay.count(), prisma.connectedAccount.count(), prisma.chatMessage.count()]).then(([users, overlayCount, connectedAccounts, chatMessages]) => ({
          users,
          overlays: overlayCount,
          connectedAccounts,
          chatMessages
        }))
      : null
  ]);
  return (
    <DashboardClient
      user={user}
      overlays={overlays.map((overlay) => ({
        id: overlay.id,
        name: overlay.name,
        theme: overlay.theme,
        fontSize: overlay.fontSize,
        fontFamily: overlay.fontFamily,
        backgroundOpacity: overlay.backgroundOpacity,
        animationStyle: overlay.animationStyle,
        platformBadges: overlay.platformBadges,
        messageLifetime: overlay.messageLifetime,
        profanityFilter: overlay.profanityFilter
      }))}
      accounts={accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        displayName: account.displayName,
        username: account.username
      }))}
      metrics={metrics}
    />
  );
}
