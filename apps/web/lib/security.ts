import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

function encryptionKey(): Buffer {
  const value = process.env.TOKEN_ENCRYPTION_KEY || "local-dev-streamfusion-key!";
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(value).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string): string {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, hash: string): boolean {
  const left = Buffer.from(hashToken(token));
  const right = Buffer.from(hash);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createPrivateToken(): string {
  return randomBytes(32).toString("base64url");
}
