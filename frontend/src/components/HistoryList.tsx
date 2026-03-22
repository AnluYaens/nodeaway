"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import { getHistory } from "@/lib/api";
import type { Execution } from "@/lib/types";

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
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.24),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(247,243,236,0.84))] shadow-panel dark:bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.22),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]">
          <div className="grid grid-cols-2 gap-2">
            <span className="h-3 w-3 rounded-full bg-dev" />
            <span className="h-3 w-3 rounded-full bg-life" />
            <span className="h-3 w-3 rounded-full bg-biz" />
            <span className="h-3 w-3 rounded-full bg-black/15 dark:bg-white/20" />
          </div>
        </div>
        <p className="font-display text-4xl">Aún no has ejecutado ninguna automatización</p>
        <p className="mt-4 text-sm leading-7 text-black/60 dark:text-white/60">
          Cuando lances una automatizacion, el historial aparecera aqui con acceso rapido a sus resultados.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          Explorar catálogo
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
