CREATE TYPE "ChatPlatform" AS ENUM ('TWITCH', 'KICK', 'X', 'MOCK');
CREATE TYPE "OverlayTheme" AS ENUM ('DARK', 'LIGHT', 'NEON', 'MINIMAL');
CREATE TYPE "AnimationStyle" AS ENUM ('NONE', 'FADE', 'SLIDE', 'POP');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "image" TEXT,
  "resetTokenHash" TEXT,
  "resetTokenExpires" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectedAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "ChatPlatform" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "encryptedAccessToken" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "scopes" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Overlay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "theme" "OverlayTheme" NOT NULL DEFAULT 'DARK',
  "fontSize" INTEGER NOT NULL DEFAULT 22,
  "fontFamily" TEXT NOT NULL DEFAULT 'Inter, Arial, sans-serif',
  "backgroundOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
  "animationStyle" "AnimationStyle" NOT NULL DEFAULT 'FADE',
  "platformBadges" BOOLEAN NOT NULL DEFAULT true,
  "messageLifetime" INTEGER NOT NULL DEFAULT 18,
  "profanityFilter" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Overlay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OverlayToken" (
  "id" TEXT NOT NULL,
  "overlayId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OverlayToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "overlayId" TEXT NOT NULL,
  "platform" "ChatPlatform" NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "message" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "badges" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ConnectedAccount_provider_providerAccountId_key" ON "ConnectedAccount"("provider", "providerAccountId");
CREATE INDEX "ConnectedAccount_userId_idx" ON "ConnectedAccount"("userId");
CREATE INDEX "Overlay_userId_idx" ON "Overlay"("userId");
CREATE UNIQUE INDEX "OverlayToken_overlayId_key" ON "OverlayToken"("overlayId");
CREATE INDEX "ChatMessage_overlayId_timestamp_idx" ON "ChatMessage"("overlayId", "timestamp");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Overlay" ADD CONSTRAINT "Overlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OverlayToken" ADD CONSTRAINT "OverlayToken_overlayId_fkey" FOREIGN KEY ("overlayId") REFERENCES "Overlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_overlayId_fkey" FOREIGN KEY ("overlayId") REFERENCES "Overlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
