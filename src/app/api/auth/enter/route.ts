import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  buildSetCookieHeader,
  checkRateLimit,
  normalizeWhatsApp,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`enter:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { whatsapp, pin } = body as {
      whatsapp?: string;
      pin?: string;
    };

    if (!whatsapp?.trim() || !pin) {
      return NextResponse.json(
        { error: "WhatsApp y PIN son requeridos." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeWhatsApp(whatsapp);

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerWhatsApp: normalizedPhone },
    });

    if (!restaurant || !restaurant.pinHash) {
      return NextResponse.json(
        { error: "No encontramos una cuenta con ese WhatsApp." },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(pin, restaurant.pinHash);
    if (!valid) {
      return NextResponse.json(
        { error: "PIN incorrecto. Inténtalo de nuevo." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });

    response.headers.set("Set-Cookie", buildSetCookieHeader(restaurant.id));
    return response;
  } catch (error) {
    console.error("Enter error:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión." },
      { status: 500 }
    );
  }
}
