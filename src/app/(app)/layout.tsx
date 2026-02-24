import { RestaurantProvider } from "@/context/restaurant";
import AppNav from "@/components/AppNav";
import SetupGate from "@/components/SetupGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RestaurantProvider>
      <div className="min-h-screen">
        <AppNav />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <SetupGate>{children}</SetupGate>
        </main>
      </div>
    </RestaurantProvider>
  );
}
