import { z } from "zod";

export const platformSchema = z.enum(["TWITCH", "KICK", "X", "MOCK"]);
export type ChatPlatform = z.infer<typeof platformSchema>;

export const overlayThemeSchema = z.enum(["DARK", "LIGHT", "NEON", "MINIMAL"]);
export type OverlayTheme = z.infer<typeof overlayThemeSchema>;

export const animationStyleSchema = z.enum(["NONE", "FADE", "SLIDE", "POP"]);
export type AnimationStyle = z.infer<typeof animationStyleSchema>;

export const unifiedChatMessageSchema = z.object({
  id: z.string(),
  platform: platformSchema,
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  message: z.string(),
  timestamp: z.string(),
  badges: z.array(z.string())
});

export type UnifiedChatMessage = z.infer<typeof unifiedChatMessageSchema>;

export const overlaySettingsSchema = z.object({
  name: z.string().min(1).max(80),
  theme: overlayThemeSchema.default("DARK"),
  fontSize: z.coerce.number().int().min(12).max(64).default(22),
  fontFamily: z.string().min(1).max(120).default("Inter, Arial, sans-serif"),
  backgroundOpacity: z.coerce.number().min(0).max(1).default(0.65),
  animationStyle: animationStyleSchema.default("FADE"),
  platformBadges: z.coerce.boolean().default(true),
  messageLifetime: z.coerce.number().int().min(3).max(120).default(18),
  profanityFilter: z.coerce.boolean().default(true)
});

export type OverlaySettingsInput = z.input<typeof overlaySettingsSchema>;
export type OverlaySettings = z.output<typeof overlaySettingsSchema>;

const profanity = ["fuck", "shit", "bitch", "asshole", "cunt", "slur"];

export function filterProfanity(message: string): string {
  return profanity.reduce((current, word) => {
    const expression = new RegExp(`\\b${word}\\b`, "gi");
    return current.replace(expression, "*".repeat(word.length));
  }, message);
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}
