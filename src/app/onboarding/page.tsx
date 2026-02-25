"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    restaurantName: "",
    ownerName: "",
    whatsapp: "",
    pin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(form.pin)) {
      setError("El PIN debe ser exactamente 4 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear restaurante.");
        return;
      }

      router.push("/scanner");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)] focus:border-[var(--primary)] transition-all";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-8 inline-block"
        >
          ← Volver
        </Link>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">
              Crear mi restaurante
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              En 30 segundos estás listo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Nombre del restaurante
              </label>
              <input
                type="text"
                required
                value={form.restaurantName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, restaurantName: e.target.value }))
                }
                className={inputClass}
                placeholder="La Terraza Roma"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Tu nombre
              </label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerName: e.target.value }))
                }
                className={inputClass}
                placeholder="Diego Haddad"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                WhatsApp
              </label>
              <input
                type="tel"
                required
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsapp: e.target.value }))
                }
                className={inputClass}
                placeholder="55 1234 5678"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                PIN de 4 dígitos
              </label>
              <input
                type="password"
                required
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={form.pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm((f) => ({ ...f, pin: v }));
                }}
                className={`${inputClass} text-center tracking-[0.5em] text-lg font-mono`}
                placeholder="• • • •"
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">
                Usarás este PIN para entrar cada vez
              </p>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-[var(--danger-light)] border border-[var(--danger)]/20 rounded-xl">
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? "Creando..." : "Crear restaurante"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[var(--muted)] mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/enter"
            className="text-[var(--primary)] hover:underline"
          >
            Entra aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
