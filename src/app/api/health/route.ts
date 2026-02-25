import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const restaurantCount = await prisma.restaurant.count();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      restaurants: restaurantCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", db: "disconnected", error: message },
      { status: 503 }
    );
  }
}
