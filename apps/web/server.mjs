import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { MockProvider } from "@streamfusion/chat-core";
import { PrismaClient } from "@prisma/client";
import { createDecipheriv, createHash, randomUUID, timingSafeEqual } from "crypto";

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function encryptionKey() {
  const value = process.env.TOKEN_ENCRYPTION_KEY || "local-dev-streamfusion-key!";
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(value).digest();
}

function decryptSecret(value) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function verifyToken(token, hash) {
  const left = Buffer.from(hashToken(token));
  const right = Buffer.from(hash);
  return left.length === right.length && timingSafeEqual(left, right);
}

app.prepare().then(async () => {
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, { path: "/socket.io" });
  const twitchConnections = new Map();

  io.use(async (socket, nextMiddleware) => {
    const overlayId = String(socket.handshake.auth.overlayId || "");
    const token = String(socket.handshake.auth.token || "");
    const overlay = await prisma.overlay.findUnique({ where: { id: overlayId }, include: { token: true } });
    if (!overlay?.token || !verifyToken(token, overlay.token.tokenHash)) return nextMiddleware(new Error("Invalid overlay token."));
    socket.data.overlayId = overlayId;
    nextMiddleware();
  });

  io.on("connection", (socket) => socket.join(`overlay:${socket.data.overlayId}`));

  globalThis.__streamfusionPublish = (overlayId, message) => {
    io.to(`overlay:${overlayId}`).emit("chat:message", message);
  };

  async function deliverToUserOverlays(userId, message) {
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

  function normalizeTwitchIrcMessage(line) {
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

  function parseIrcTags(raw) {
    return Object.fromEntries(raw.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key, value.replace(/\\s/g, " ").replace(/\\:/g, ";")];
    }));
  }

  await syncTwitchConnections();
  setInterval(() => syncTwitchConnections().catch((error) => console.error("Twitch sync failed", error)), 30000);

  if (process.env.MOCK_PROVIDER_ENABLED !== "false") {
    const provider = new MockProvider();
    provider.subscribe(async (message) => {
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

  server.listen(port, hostname, () => console.log(`StreamFusion ready on http://${hostname}:${port}`));
});
