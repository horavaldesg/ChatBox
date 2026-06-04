import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "streamfusion",
      database: "reachable"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({
      ok: true,
      service: "streamfusion",
      database: "unreachable",
      databaseError: message
    });
  }
}
