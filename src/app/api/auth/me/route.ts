import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantIdFromCookie } from "@/lib/auth";

export async function GET() {
  const restaurantId = await getRestaurantIdFromCookie();
  if (!restaurantId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, ownerName: true, slug: true },
  });

  if (!restaurant) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    ownerName: restaurant.ownerName,
  });
}
