import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { createPrivateToken, hashToken } from "../lib/security";

async function main() {
  const email = "admin@example.com";
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "StreamFusion Admin",
      passwordHash: await bcrypt.hash("streamfusion123", 12)
    },
    update: {}
  });
  const token = createPrivateToken();
  const overlay = await prisma.overlay.create({
    data: {
      userId: user.id,
      name: "Development Overlay",
      token: { create: { tokenHash: hashToken(token) } }
    }
  });
  console.log(`Seed user: ${email} / streamfusion123`);
  console.log(`Overlay URL: ${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")}/overlay/${overlay.id}?token=${token}`);
}

main().finally(() => prisma.$disconnect());
