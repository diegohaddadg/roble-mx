import { cookies } from "next/headers";

export const COOKIE_NAME = "toast_restaurant_id";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getRestaurantIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function buildSetCookieHeader(restaurantId: string): string {
  const parts = [
    `${COOKIE_NAME}=${restaurantId}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${THIRTY_DAYS}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function buildClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Simple in-memory rate limiter (per IP, per endpoint)
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  ip: string,
  maxAttempts = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("52") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}
