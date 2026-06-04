import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashToken } from "@/lib/security";
import { appUrl } from "@streamfusion/shared";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });
  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(token),
      resetTokenExpires: new Date(Date.now() + 1000 * 60 * 30)
    }
  });
  await audit(user.id, "password_reset.requested", { email });
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return NextResponse.json({ ok: true, resetUrl });
}
