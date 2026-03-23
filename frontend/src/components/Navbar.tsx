"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";

import { useTheme } from "@/components/providers/AppProviders";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12H2.75M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M20 15.2A8.5 8.5 0 1 1 8.8 4 7 7 0 0 0 20 15.2Z" />
    </svg>
  );
}

const navLinks = [
  { href: "/catalog", label: "Catálogo" },
  { href: "/history", label: "Historial" }
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-black/10 bg-white/78 px-4 py-3 shadow-panel backdrop-blur-xl dark:border-white/10 dark:bg-night/72">
        <div className="flex items-center justify-between gap-4">
          <Link href="/catalog" className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center">
              <div className="absolute inset-0 rounded-[1rem] bg-gradient-to-br from-dev via-life to-biz opacity-90 blur-[2px]" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/35 bg-ink text-[0.68rem] font-bold uppercase tracking-[0.22em] text-white dark:bg-white dark:text-night">
                NW
              </div>
            </div>
            <div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-3xl leading-none tracking-tight"
              >
                Nodeaway
              </motion.p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
                Automatizaciones sin workflow
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-2">
              {navLinks.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                      active
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/75 text-black/75 transition hover:border-black/20 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:border-white/20 dark:hover:text-white"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
