"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import { getHistory } from "@/lib/api";
import type { Execution } from "@/lib/types";

function EmptyHistoryIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden="true">
      <defs>
        <linearGradient id="history-ring" x1="20" x2="96" y1="18" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7F77DD" />
          <stop offset="0.55" stopColor="#1D9E75" />
          <stop offset="1" stopColor="#D85A30" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="38" fill="none" opacity="0.2" stroke="url(#history-ring)" strokeWidth="8" />
      <circle cx="60" cy="60" r="26" fill="rgba(255,255,255,0.72)" stroke="rgba(22,22,22,0.08)" strokeWidth="2" />
      <path
        d="M60 45v16l11 7"
        fill="none"
        stroke="url(#history-ring)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M30 54H18m8-10-8 10 8 10"
        fill="none"
        opacity="0.72"
        stroke="rgba(22,22,22,0.28)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <circle cx="89" cy="34" r="7" fill="#D85A30" opacity="0.18" />
      <circle cx="95" cy="80" r="5" fill="#1D9E75" opacity="0.22" />
    </svg>
  );
}

export function HistoryList() {
  const [history, setHistory] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const data = await getHistory();
        if (!cancelled) {
          setHistory(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-72 animate-pulse rounded-[2rem] border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5" />;
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-rose-300 bg-rose-50 p-8 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/15 bg-white/75 p-10 text-center shadow-panel dark:border-white/15 dark:bg-white/5">
        <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.24),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(247,243,236,0.84))] shadow-panel dark:bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.22),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]">
          <EmptyHistoryIllustration />
        </div>
        <p className="font-display text-4xl">Aún no has ejecutado ninguna automatización</p>
        <p className="mt-4 text-sm leading-7 text-black/60 dark:text-white/60">
          Cuando lances una automatización, verás aquí cada ejecución con acceso rápido a sus resultados.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:gap-3 hover:opacity-90 dark:bg-white dark:text-black"
        >
          Explorar catálogo
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((execution, index) => (
        <motion.div
          key={execution.executionId}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: index * 0.04 }}
          className="rounded-[1.75rem] border border-black/10 bg-white/80 p-5 shadow-panel dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold">{execution.recipeTitle}</p>
              <p className="mt-2 text-sm text-black/55 dark:text-white/55">
                {new Intl.DateTimeFormat("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(execution.createdAt))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {execution.status}
              </span>
              <Link
                href={`/results/${execution.executionId}`}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/72 transition hover:border-black/20 dark:border-white/10 dark:text-white/72 dark:hover:border-white/20"
              >
                Ver resultados
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
