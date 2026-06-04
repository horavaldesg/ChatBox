import { randomUUID } from "crypto";
import type { ChatPlatform, UnifiedChatMessage } from "@streamfusion/shared";

export type ChatHandler = (message: UnifiedChatMessage) => void;

export interface IChatProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(handler: ChatHandler): () => void;
  normalizeMessage(raw: unknown): UnifiedChatMessage;
}

abstract class BaseProvider implements IChatProvider {
  protected handlers = new Set<ChatHandler>();

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract normalizeMessage(raw: unknown): UnifiedChatMessage;

  subscribe(handler: ChatHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  protected publish(message: UnifiedChatMessage): void {
    for (const handler of this.handlers) handler(message);
  }
}

export class MockProvider extends BaseProvider {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly users = ["Ava", "Mason", "Noor", "Kai", "Lina", "Jules"];
  private readonly messages = [
    "That transition was clean.",
    "Can you show the dashboard again?",
    "StreamFusion overlay looks great in OBS.",
    "Kick and Twitch in the same feed is useful.",
    "New follower energy in chat today.",
    "Ship it."
  ];

  async connect(): Promise<void> {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.publish(this.normalizeMessage({}));
    }, 2200);
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  normalizeMessage(_raw?: unknown): UnifiedChatMessage {
    const user = this.users[Math.floor(Math.random() * this.users.length)];
    const platforms: ChatPlatform[] = ["TWITCH", "KICK", "X", "MOCK"];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    return {
      id: randomUUID(),
      platform,
      username: user.toLowerCase(),
      displayName: user,
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user)}`,
      message: this.messages[Math.floor(Math.random() * this.messages.length)],
      timestamp: new Date().toISOString(),
      badges: platform === "TWITCH" ? ["mod"] : platform === "KICK" ? ["sub"] : []
    };
  }
}

export class TwitchProvider extends BaseProvider {
  constructor(private readonly accessToken: string, private readonly channel: string) {
    super();
  }

  async connect(): Promise<void> {
    if (!this.accessToken || !this.channel) throw new Error("Twitch token and channel are required.");
  }

  async disconnect(): Promise<void> {}

  normalizeMessage(raw: unknown): UnifiedChatMessage {
    const source = raw as Partial<UnifiedChatMessage> & { user_name?: string; text?: string };
    return {
      id: source.id || randomUUID(),
      platform: "TWITCH",
      username: source.username || source.user_name || "twitch_user",
      displayName: source.displayName || source.user_name || "Twitch User",
      avatarUrl: source.avatarUrl || null,
      message: source.message || source.text || "",
      timestamp: source.timestamp || new Date().toISOString(),
      badges: source.badges || []
    };
  }
}

export class KickProvider extends BaseProvider {
  constructor(private readonly accessToken: string, private readonly channel: string) {
    super();
  }

  async connect(): Promise<void> {
    if (!this.accessToken || !this.channel) throw new Error("Kick token and channel are required.");
  }

  async disconnect(): Promise<void> {}

  normalizeMessage(raw: unknown): UnifiedChatMessage {
    const source = raw as Partial<UnifiedChatMessage> & { sender?: string; content?: string };
    return {
      id: source.id || randomUUID(),
      platform: "KICK",
      username: source.username || source.sender || "kick_user",
      displayName: source.displayName || source.sender || "Kick User",
      avatarUrl: source.avatarUrl || null,
      message: source.message || source.content || "",
      timestamp: source.timestamp || new Date().toISOString(),
      badges: source.badges || []
    };
  }
}
