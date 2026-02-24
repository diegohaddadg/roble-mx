"use client";

import Dashboard from "@/components/Dashboard";
import { useRestaurant } from "@/context/restaurant";

export default function DashboardPage() {
  const { restaurantId } = useRestaurant();

  return <Dashboard restaurantId={restaurantId} />;
}
