"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface RestaurantContextValue {
  restaurantId: string;
  restaurantName: string;
  isReady: boolean;
  setSession: (id: string, name: string) => void;
  clearSession: () => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({
  children,
  initialId,
  initialName,
}: {
  children: ReactNode;
  initialId?: string;
  initialName?: string;
}) {
  const [restaurantId, setRestaurantId] = useState(initialId ?? "");
  const [restaurantName, setRestaurantName] = useState(initialName ?? "");
  const [isReady, setIsReady] = useState(!!initialId);

  useEffect(() => {
    if (initialId) {
      setIsReady(true);
      return;
    }

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setRestaurantId(data.restaurantId);
          setRestaurantName(data.restaurantName ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, [initialId]);

  const setSession = useCallback((id: string, name: string) => {
    setRestaurantId(id);
    setRestaurantName(name);
  }, []);

  const clearSession = useCallback(() => {
    setRestaurantId("");
    setRestaurantName("");
  }, []);

  return (
    <RestaurantContext.Provider
      value={{ restaurantId, restaurantName, isReady, setSession, clearSession }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error("useRestaurant must be used within RestaurantProvider");
  }
  return ctx;
}
