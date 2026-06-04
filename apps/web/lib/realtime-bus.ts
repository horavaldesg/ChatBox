import type { UnifiedChatMessage } from "@streamfusion/shared";

type RealtimePublisher = (overlayId: string, message: UnifiedChatMessage) => void;

type RealtimeGlobal = typeof globalThis & {
  __streamfusionPublish?: RealtimePublisher;
};

export function setRealtimePublisher(publisher: RealtimePublisher): void {
  (globalThis as RealtimeGlobal).__streamfusionPublish = publisher;
}

export function publishRealtimeMessage(overlayId: string, message: UnifiedChatMessage): boolean {
  const publisher = (globalThis as RealtimeGlobal).__streamfusionPublish;
  if (!publisher) return false;
  publisher(overlayId, message);
  return true;
}
