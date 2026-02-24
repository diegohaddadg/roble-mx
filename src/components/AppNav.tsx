"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRestaurant } from "@/context/restaurant";

const navItems = [
  { href: "/scanner", label: "Facturas", icon: "📸" },
  { href: "/recipes", label: "Recetas", icon: "🍳" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const { restaurantId } = useRestaurant();

  return (
    <nav className="bg-white border-b border-zinc-200 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-bold text-lg text-zinc-900">Toast MX</span>
        </div>

        {restaurantId && (
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
