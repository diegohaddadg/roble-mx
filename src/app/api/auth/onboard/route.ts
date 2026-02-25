import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  buildSetCookieHeader,
  checkRateLimit,
  slugify,
  normalizeWhatsApp,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`onboard:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { restaurantName, ownerName, whatsapp, pin } = body as {
      restaurantName?: string;
      ownerName?: string;
      whatsapp?: string;
      pin?: string;
    };

    if (!restaurantName?.trim()) {
      return NextResponse.json(
        { error: "Nombre del restaurante es requerido." },
        { status: 400 }
      );
    }
    if (!ownerName?.trim()) {
      return NextResponse.json(
        { error: "Tu nombre es requerido." },
        { status: 400 }
      );
    }
    if (!whatsapp?.trim()) {
      return NextResponse.json(
        { error: "WhatsApp es requerido." },
        { status: 400 }
      );
    }
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "El PIN debe ser exactamente 4 dígitos." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeWhatsApp(whatsapp);

    const existing = await prisma.restaurant.findUnique({
      where: { ownerWhatsApp: normalizedPhone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese WhatsApp. Usa \"Ya tengo cuenta\"." },
        { status: 409 }
      );
    }

    let slug = slugify(restaurantName);
    const slugExists = await prisma.restaurant.findUnique({
      where: { slug },
    });
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: restaurantName.trim(),
        slug,
        ownerName: ownerName.trim(),
        ownerWhatsApp: normalizedPhone,
        pinHash,
      },
    });

    const response = NextResponse.json({
      ok: true,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });

    response.headers.set("Set-Cookie", buildSetCookieHeader(restaurant.id));
    return response;
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json(
      { error: "Error al crear restaurante." },
      { status: 500 }
    );
  }
}
