import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";

import "@/styles/globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "AutoPilot",
  description: "Automatizaciones listas para usar. Elige, configura, ejecuta."
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
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
