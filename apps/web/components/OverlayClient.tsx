"use client";

import type { UnifiedChatMessage } from "@streamfusion/shared";
import { filterProfanity } from "@streamfusion/shared";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

type OverlaySettings = {
  id: string;
  theme: string;
  fontSize: number;
  fontFamily: string;
  backgroundOpacity: number;
  animationStyle: string;
  platformBadges: boolean;
  messageLifetime: number;
  profanityFilter: boolean;
};

export function OverlayClient({ overlay, token }: { overlay: OverlaySettings; token: string }) {
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const styles = useMemo(() => themeStyles(overlay.theme, overlay.backgroundOpacity), [overlay.theme, overlay.backgroundOpacity]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket"], auth: { overlayId: overlay.id, token } });
    socket.on("chat:message", (message: UnifiedChatMessage) => {
      setMessages((current) => [...current, message].slice(-30));
      window.setTimeout(() => setMessages((current) => current.filter((item) => item.id !== message.id)), overlay.messageLifetime * 1000);
    });
    return () => {
      socket.disconnect();
    };
  }, [overlay.id, overlay.messageLifetime, token]);

  return (
    <main className="min-h-screen bg-transparent p-5" style={{ fontFamily: overlay.fontFamily, fontSize: overlay.fontSize }}>
      <div className="flex max-w-3xl flex-col gap-2">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-md px-4 py-3 shadow-lg ${animationClass(overlay.animationStyle)}`} style={styles}>
            <div className="flex items-center gap-2">
              {overlay.platformBadges && <span className="rounded-sm px-2 py-0.5 text-xs font-semibold" style={{ background: platformColor(message.platform), color: "#fff" }}>{message.platform}</span>}
              <span className="font-semibold">{message.displayName}</span>
              {message.badges.map((badge) => <span key={badge} className="rounded-sm bg-white/20 px-1.5 py-0.5 text-xs">{badge}</span>)}
            </div>
            <p className="mt-1 leading-snug">{overlay.profanityFilter ? filterProfanity(message.message) : message.message}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function themeStyles(theme: string, opacity: number): CSSProperties {
  if (theme === "LIGHT") return { background: `rgba(255,255,255,${opacity})`, color: "#141414" };
  if (theme === "NEON") return { background: `rgba(12,12,12,${opacity})`, color: "#68ffd8", border: "1px solid #68ffd8" };
  if (theme === "MINIMAL") return { background: `rgba(20,20,20,${Math.min(opacity, 0.35)})`, color: "#fff" };
  return { background: `rgba(20,20,20,${opacity})`, color: "#fff" };
}

function animationClass(animation: string): string {
  if (animation === "SLIDE") return "animate-[slideIn_.22s_ease-out]";
  if (animation === "POP") return "animate-[popIn_.18s_ease-out]";
  if (animation === "FADE") return "animate-[fadeIn_.2s_ease-out]";
  return "";
}

function platformColor(platform: string): string {
  if (platform === "TWITCH") return "#6441a5";
  if (platform === "KICK") return "#53fc18";
  if (platform === "X") return "#111111";
  return "#ef6a5b";
}
