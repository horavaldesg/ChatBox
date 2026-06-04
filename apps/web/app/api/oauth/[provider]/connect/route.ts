import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-origin";

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

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const origin = publicOrigin(request);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", origin));
  const { provider } = await params;
  if (provider !== "twitch" && provider !== "kick") return NextResponse.redirect(new URL("/dashboard?oauth=unsupported", origin));
  const item = config[provider];
  if (!item?.clientId) return NextResponse.redirect(new URL(`/dashboard?oauth=${provider}-not-configured`, origin));
  const redirectUri = item.redirectUri || `${origin}/api/oauth/${provider}/callback`;
  const state = randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set(`oauth_state_${provider}`, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600 });
  const url = new URL(item.authUrl);
  url.searchParams.set("client_id", item.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", item.scope);
  url.searchParams.set("state", state);
  if (provider === "kick") {
    const verifier = randomBytes(64).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    jar.set("oauth_pkce_kick", verifier, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600 });
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return NextResponse.redirect(url);
}
