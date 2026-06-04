import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/security";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(20),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (!user?.resetTokenHash || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return NextResponse.json({ error: "Reset token is invalid or expired." }, { status: 400 });
  }
  if (!verifyToken(parsed.data.token, user.resetTokenHash)) {
    return NextResponse.json({ error: "Reset token is invalid or expired." }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      resetTokenHash: null,
      resetTokenExpires: null
    }
  });
  await audit(user.id, "password_reset.completed", {});
  return NextResponse.json({ ok: true });
}
