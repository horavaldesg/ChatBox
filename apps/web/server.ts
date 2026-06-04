import { createServer } from "http";
import { randomUUID } from "crypto";
import next from "next";
import { Server } from "socket.io";
import { MockProvider } from "@streamfusion/chat-core";
import type { UnifiedChatMessage } from "@streamfusion/shared";
import { prisma } from "./lib/db";
import { setRealtimePublisher } from "./lib/realtime-bus";
import { decryptSecret, verifyToken } from "./lib/security";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, { path: "/socket.io" });
  const twitchConnections = new Map<string, WebSocket>();

  io.use(async (socket, nextMiddleware) => {
    const overlayId = String(socket.handshake.auth.overlayId || "");
    const token = String(socket.handshake.auth.token || "");
    const overlay = await prisma.overlay.findUnique({ where: { id: overlayId }, include: { token: true } });
    if (!overlay?.token || !verifyToken(token, overlay.token.tokenHash)) return nextMiddleware(new Error("Invalid overlay token."));
    socket.data.overlayId = overlayId;
    nextMiddleware();
  });

  io.on("connection", (socket) => {
    socket.join(`overlay:${socket.data.overlayId}`);
  });

  setRealtimePublisher((overlayId, message) => {
    io.to(`overlay:${overlayId}`).emit("chat:message", message);
  });

  async function deliverToUserOverlays(userId: string, message: UnifiedChatMessage) {
    const overlays = await prisma.overlay.findMany({ where: { userId } });
    for (const overlay of overlays) {
      await prisma.chatMessage.create({
        data: {
          id: `${overlay.id}:${message.id}`,
          overlayId: overlay.id,
          platform: message.platform,
          username: message.username,
          displayName: message.displayName,
          avatarUrl: message.avatarUrl,
          message: message.message,
          timestamp: new Date(message.timestamp),
          badges: message.badges
        }
      }).catch(() => undefined);
      io.to(`overlay:${overlay.id}`).emit("chat:message", message);
    }
  }

  async function syncTwitchConnections() {
    const accounts = await prisma.connectedAccount.findMany({ where: { provider: "TWITCH" } });
    const accountIds = new Set(accounts.map((account) => account.id));
    for (const [accountId, socket] of twitchConnections.entries()) {
      if (!accountIds.has(accountId)) {
        socket.close();
        twitchConnections.delete(accountId);
      }
    }
    for (const account of accounts) {
      if (twitchConnections.has(account.id)) continue;
      const channel = account.username.toLowerCase();
      const nick = channel.replace(/[^a-z0-9_]/g, "");
      if (!nick) continue;
      const socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
      twitchConnections.set(account.id, socket);
      socket.addEventListener("open", () => {
        const token = decryptSecret(account.encryptedAccessToken).replace(/^oauth:/i, "");
        socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        socket.send(`PASS oauth:${token}`);
        socket.send(`NICK ${nick}`);
        socket.send(`JOIN #${channel}`);
        console.log(`Twitch chat connected for #${channel}`);
      });
      socket.addEventListener("message", async (event) => {
        for (const line of String(event.data).split("\r\n").filter(Boolean)) {
          if (line.startsWith("PING")) {
            socket.send("PONG :tmi.twitch.tv");
            continue;
          }
          const message = normalizeTwitchIrcMessage(line);
          if (message) await deliverToUserOverlays(account.userId, message);
        }
      });
      socket.addEventListener("close", () => {
        twitchConnections.delete(account.id);
        console.log(`Twitch chat disconnected for #${channel}`);
      });
      socket.addEventListener("error", (event) => {
        console.error(`Twitch chat error for #${channel}`, event);
      });
    }
  }

  function normalizeTwitchIrcMessage(line: string): UnifiedChatMessage | null {
    const match = line.match(/^@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :([\s\S]*)$/);
    if (!match) return null;
    const tags = parseIrcTags(match[1]);
    const username = match[2];
    const displayName = tags["display-name"] || username;
    const badges = (tags.badges || "").split(",").filter(Boolean).map((badge) => badge.split("/")[0]);
    return {
      id: tags.id || randomUUID(),
      platform: "TWITCH",
      username,
      displayName,
      avatarUrl: null,
      message: match[3],
      timestamp: tags["tmi-sent-ts"] ? new Date(Number(tags["tmi-sent-ts"])).toISOString() : new Date().toISOString(),
      badges
    };
  }

  function parseIrcTags(raw: string): Record<string, string> {
    return Object.fromEntries(raw.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key, value.replace(/\\s/g, " ").replace(/\\:/g, ";")];
    }));
  }

  await syncTwitchConnections();
  setInterval(() => syncTwitchConnections().catch((error) => console.error("Twitch sync failed", error)), 30000);

  if (process.env.MOCK_PROVIDER_ENABLED !== "false") {
    const provider = new MockProvider();
    provider.subscribe(async (message: UnifiedChatMessage) => {
      const overlays = await prisma.overlay.findMany();
      for (const overlay of overlays) {
        await prisma.chatMessage.create({
          data: {
            id: `${overlay.id}:${message.id}`,
            overlayId: overlay.id,
            platform: message.platform,
            username: message.username,
            displayName: message.displayName,
            avatarUrl: message.avatarUrl,
            message: message.message,
            timestamp: new Date(message.timestamp),
            badges: message.badges
          }
        }).catch(() => undefined);
        io.to(`overlay:${overlay.id}`).emit("chat:message", message);
      }
    });
    await provider.connect();
  }

  server.listen(port, hostname, () => {
    console.log(`StreamFusion ready on http://${hostname}:${port}`);
  });
});
