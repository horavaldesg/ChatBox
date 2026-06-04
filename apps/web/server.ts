import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { MockProvider } from "@streamfusion/chat-core";
import type { UnifiedChatMessage } from "@streamfusion/shared";
import { prisma } from "./lib/db";
import { setRealtimePublisher } from "./lib/realtime-bus";
import { verifyToken } from "./lib/security";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, { path: "/socket.io" });

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
