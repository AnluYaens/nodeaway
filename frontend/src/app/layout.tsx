import type { Metadata } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AppProviders } from "@/components/providers/AppProviders";
import "@/styles/globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Nodeaway — Automatizaciones sin workflow",
  description: "Elige. Configura. Ejecuta. Automatizaciones listas para usar sin flujos visibles.",
  icons: {
    icon: "/icon.svg"
  },
  openGraph: {
    title: "Nodeaway — Automatizaciones sin workflow",
    description: "Catalogo visual de automatizaciones con formularios simples y resultados listos para usar.",
    images: ["/og-image.svg"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodeaway — Automatizaciones sin workflow",
    description: "Catalogo visual de automatizaciones con formularios simples y resultados listos para usar.",
    images: ["/og-image.svg"]
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} bg-paper text-ink antialiased dark:bg-night dark:text-white`}
      >
        <AppProviders>
          <div className="min-h-screen">
            <Navbar />
            <div className="relative">
              {children}
            </div>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
