import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toast MX — Inteligencia de Costos para Restaurantes",
  description:
    "Escanea facturas, rastrea costos, y descubre la rentabilidad real de cada platillo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
