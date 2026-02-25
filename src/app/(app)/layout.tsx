import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RestaurantProvider } from "@/context/restaurant";
import AppNav from "@/components/AppNav";
import { COOKIE_NAME } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const restaurantId = cookieStore.get(COOKIE_NAME)?.value;

  if (!restaurantId) {
    redirect("/");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true },
  });

  if (!restaurant) {
    redirect("/");
  }

  return (
    <RestaurantProvider
      initialId={restaurant.id}
      initialName={restaurant.name}
    >
      <div className="min-h-screen">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </RestaurantProvider>
  );
}
