"use client";

import { useRef, type ReactNode } from "react";
import { useRestaurant } from "@/context/restaurant";

interface SetupGateProps {
  children: ReactNode;
}

export default function SetupGate({ children }: SetupGateProps) {
  const { restaurantId, isReady, setRestaurantId } = useRestaurant();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <h1 className="text-xl font-bold text-zinc-900">Toast MX</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Configuración de desarrollo
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Restaurant ID (del seed)
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Pega el ID aquí..."
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setRestaurantId((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  if (inputRef.current) setRestaurantId(inputRef.current.value);
                }}
                className="w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-sm shadow-orange-500/25"
              >
                Comenzar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
