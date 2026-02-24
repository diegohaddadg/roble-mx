"use client";

import { useRouter } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import { useRestaurant } from "@/context/restaurant";

export default function NewRecipePage() {
  const { restaurantId } = useRestaurant();
  const router = useRouter();

  return (
    <RecipeForm
      restaurantId={restaurantId}
      onSaved={() => router.push("/recipes")}
      onCancel={() => router.push("/recipes")}
    />
  );
}
