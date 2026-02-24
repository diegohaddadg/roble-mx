"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";

const navItems = [
  { href: "/scanner", label: "Facturas" },
  { href: "/recipes", label: "Recetas" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const { restaurantId } = useRestaurant();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/scanner" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-semibold text-zinc-900 hidden sm:block">
              Toast MX
            </span>
          </Link>

          {restaurantId && (
            <div className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                      isActive
                        ? "text-indigo-700 bg-indigo-50"
                        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
