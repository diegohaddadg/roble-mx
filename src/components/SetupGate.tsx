"use client";

import { useRef, type ReactNode } from "react";
import { useRestaurant } from "@/context/restaurant";

interface SetupGateProps {
  children: ReactNode;
}

export default function SetupGate({ children }: SetupGateProps) {
  const { restaurantId, isReady, setRestaurantId } = useRestaurant();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isReady) return null;

  if (!restaurantId) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Toast MX</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Configuración de desarrollo
            </p>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-500">
              Restaurant ID (del seed)
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Pega el ID aquí..."
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setRestaurantId((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              onClick={() => {
                if (inputRef.current) setRestaurantId(inputRef.current.value);
              }}
              className="w-full py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              Comenzar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
