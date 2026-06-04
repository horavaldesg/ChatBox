import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appUrl } from "@streamfusion/shared";

const config = {
  twitch: {
    authUrl: "https://id.twitch.tv/oauth2/authorize",
    clientId: process.env.TWITCH_CLIENT_ID,
    redirectUri: process.env.TWITCH_REDIRECT_URI,
    scope: "user:read:email chat:read"
  },
  kick: {
    authUrl: "https://id.kick.com/oauth/authorize",
    clientId: process.env.KICK_CLIENT_ID,
    redirectUri: process.env.KICK_REDIRECT_URI,
    scope: "user:read channel:read"
  }
};

export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", appUrl()));
  const { provider } = await params;
  if (provider !== "twitch" && provider !== "kick") return NextResponse.redirect(new URL("/dashboard?oauth=unsupported", appUrl()));
  const item = config[provider];
  if (!item?.clientId || !item.redirectUri) return NextResponse.redirect(new URL(`/dashboard?oauth=${provider}-not-configured`, appUrl()));
  const state = randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set(`oauth_state_${provider}`, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600 });
  const url = new URL(item.authUrl);
  url.searchParams.set("client_id", item.clientId);
  url.searchParams.set("redirect_uri", item.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", item.scope);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
