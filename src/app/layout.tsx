import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Global Dispatch | NewCron",
  description: "Centro de operaciones para solicitudes de transporte de vehículos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><AppShell>{children}</AppShell></body>
    </html>
  );
}
