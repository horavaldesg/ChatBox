import { decryptSecret, encryptSecret } from "./security";

export const oauthConfig = {
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

export async function refreshProviderToken(provider: "twitch" | "kick", encryptedRefreshToken: string) {
  const item = oauthConfig[provider];
  const refreshToken = decryptSecret(encryptedRefreshToken);
  const response = await fetch(item.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: item.clientId || "",
      client_secret: item.clientSecret || "",
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });
  if (!response.ok) throw new Error(`Unable to refresh ${provider} token.`);
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string[] | string };
  const scopes = Array.isArray(token.scope) ? token.scope : String(token.scope || "").split(" ").filter(Boolean);
  return {
    encryptedAccessToken: encryptSecret(token.access_token),
    encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : encryptedRefreshToken,
    expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    scopes
  };
}
