import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({ name: z.string().min(1).max(80) });

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const user = await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });
  await audit(session.user.id, "profile.updated", {});
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
