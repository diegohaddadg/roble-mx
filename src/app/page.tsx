import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get(COOKIE_NAME)?.value;

  if (restaurantId) {
    redirect("/scanner");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-3xl">R</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-2">
          {APP_NAME}
        </h1>
        <p className="text-[var(--muted)] text-sm sm:text-base mb-10">
          {APP_TAGLINE}
        </p>

        <div className="space-y-3">
          <Link
            href="/onboarding"
            className="block w-full py-3 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors active:scale-[0.98] text-center"
          >
            Crear mi restaurante
          </Link>
          <Link
            href="/enter"
            className="block w-full py-3 text-sm font-medium text-[var(--text)] bg-[var(--border-light)] hover:bg-[var(--border)] rounded-xl transition-colors text-center"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-[11px] text-[var(--muted)] mt-8">
          Escanea facturas · Controla costos · Protege márgenes
        </p>
      </div>
    </div>
  );
}
