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
  isReady: boolean;
  setRestaurantId: (id: string) => void;
  clearRestaurantId: () => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

const STORAGE_KEY = "toast_restaurant_id";

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantIdState] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRestaurantIdState(saved);
    setIsReady(true);
  }, []);

  const setRestaurantId = useCallback((id: string) => {
    const trimmed = id.trim();
    if (trimmed) {
      setRestaurantIdState(trimmed);
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }, []);

  const clearRestaurantId = useCallback(() => {
    setRestaurantIdState("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RestaurantContext.Provider
      value={{ restaurantId, isReady, setRestaurantId, clearRestaurantId }}
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
