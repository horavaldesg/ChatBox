import { createVerify, randomUUID } from "crypto";
import type { UnifiedChatMessage } from "@streamfusion/shared";

export const KICK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;

type KickUser = {
  user_id?: number | string;
  username?: string;
  profile_picture?: string;
  channel_slug?: string;
  identity?: { badges?: Array<{ text?: string; type?: string }> } | null;
};

type KickChatPayload = {
  message_id?: string;
  broadcaster?: KickUser;
  sender?: KickUser;
  content?: string;
  created_at?: string;
};

export function verifyKickSignature(rawBody: string, headers: Headers): boolean {
  const messageId = headers.get("kick-event-message-id");
  const timestamp = headers.get("kick-event-message-timestamp");
  const signature = headers.get("kick-event-signature");
  if (!messageId || !timestamp || !signature) return false;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${messageId}.${timestamp}.${rawBody}`);
  verifier.end();
  return verifier.verify(KICK_PUBLIC_KEY, signature, "base64");
}

export function normalizeKickWebhookMessage(payload: KickChatPayload): UnifiedChatMessage {
  const sender = payload.sender || {};
  const name = sender.username || sender.channel_slug || "kick_user";
  const badges = sender.identity?.badges?.map((badge) => badge.type || badge.text || "badge").filter(Boolean) || [];
  return {
    id: payload.message_id || randomUUID(),
    platform: "KICK",
    username: name.toLowerCase(),
    displayName: name,
    avatarUrl: sender.profile_picture || null,
    message: payload.content || "",
    timestamp: payload.created_at || new Date().toISOString(),
    badges
  };
}
