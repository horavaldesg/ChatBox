import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encryptSecret } from "@/lib/security";
import { publicOrigin } from "@/lib/public-origin";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

const config = {
  twitch: {
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    userUrl: "https://api.twitch.tv/helix/users",
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI,
    platform: "TWITCH" as const
  },
  kick: {
    tokenUrl: "https://id.kick.com/oauth/token",
    userUrl: "https://api.kick.com/public/v1/users",
    clientId: process.env.KICK_CLIENT_ID,
    clientSecret: process.env.KICK_CLIENT_SECRET,
    redirectUri: process.env.KICK_REDIRECT_URI,
    platform: "KICK" as const
  }
};

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const origin = publicOrigin(request);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.redirect(new URL("/login", origin));
    const { provider } = await params;
    if (provider !== "twitch" && provider !== "kick") return NextResponse.redirect(new URL("/dashboard?oauth=unsupported", origin));
    const item = config[provider];
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const jar = await cookies();
    const savedState = jar.get(`oauth_state_${provider}`)?.value;
    if (!item || !state || state !== savedState || !code) return NextResponse.redirect(new URL("/dashboard?oauth=invalid", origin));
    const redirectUri = item.redirectUri || `${origin}/api/oauth/${provider}/callback`;
    const kickCodeVerifier = jar.get("oauth_pkce_kick")?.value;
    if (provider === "kick" && !kickCodeVerifier) return NextResponse.redirect(new URL("/dashboard?oauth=invalid", origin));
    const tokenRes = await fetchWithTimeout(item.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: item.clientId || "",
        client_secret: item.clientSecret || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        ...(provider === "kick" ? { code_verifier: kickCodeVerifier || "" } : {})
      })
    });
    if (!tokenRes.ok) {
      console.error(`${provider} token exchange failed`, tokenRes.status, await tokenRes.text().catch(() => ""));
      return NextResponse.redirect(new URL(`/dashboard?oauth=${provider}-token-failed`, origin));
    }
    const token = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] | string };
    const userRes = await fetchWithTimeout(item.userUrl, {
      headers: { Authorization: `Bearer ${token.access_token}`, ...(provider === "twitch" ? { "Client-Id": item.clientId || "" } : {}) }
    });
    const profile = userRes.ok ? await userRes.json() : {};
    if (!userRes.ok) console.error(`${provider} profile lookup failed`, userRes.status, await userRes.text().catch(() => ""));
    const account = normalizeProfile(provider, profile);
    const scopes = Array.isArray(token.scope) ? token.scope : String(token.scope || "").split(" ").filter(Boolean);
    await prisma.connectedAccount.upsert({
      where: { provider_providerAccountId: { provider: item.platform, providerAccountId: account.id } },
      create: {
        userId: session.user.id,
        provider: item.platform,
        providerAccountId: account.id,
        username: account.username,
        displayName: account.displayName,
        encryptedAccessToken: encryptSecret(token.access_token),
        encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        scopes
      },
      update: {
        userId: session.user.id,
        username: account.username,
        displayName: account.displayName,
        encryptedAccessToken: encryptSecret(token.access_token),
        encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        scopes
      }
    });
    await audit(session.user.id, "provider.connected", { provider });
    return NextResponse.redirect(new URL("/dashboard?oauth=connected", origin));
  } catch (error) {
    console.error("OAuth callback failed", error);
    return NextResponse.redirect(new URL("/dashboard?oauth=callback-error", origin));
  }
}

function normalizeProfile(provider: "twitch" | "kick", profile: any) {
  if (provider === "twitch") {
    const item = profile.data?.[0] || {};
    return { id: String(item.id || "twitch-unknown"), username: item.login || "twitch_user", displayName: item.display_name || item.login || "Twitch User" };
  }
  const item = profile.data?.[0] || profile;
  return { id: String(item.id || item.user_id || "kick-unknown"), username: item.username || item.slug || "kick_user", displayName: item.name || item.username || "Kick User" };
}
