"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import { categoryMeta, recipeCategoryById } from "@/lib/category";
import { getHistory } from "@/lib/api";
import type { Execution, RecipeCategory } from "@/lib/types";

function EmptyHistoryIllustration() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Animated background particles */}
      <motion.div
        animate={{ y: [0, -10, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 left-4 h-3 w-3 rounded-full bg-dev blur-[1px] dark:bg-dev-400"
      />
      <motion.div
        animate={{ y: [0, 12, 0], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-2 right-6 h-4 w-4 rounded-full bg-life blur-[1px] dark:bg-life-400"
      />
      <motion.div
        animate={{ y: [0, 8, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute left-10 top-1/2 h-2 w-2 rounded-full bg-biz blur-[1px] dark:bg-biz-400"
      />

      <svg viewBox="0 0 120 120" className="relative z-10 h-24 w-24 drop-shadow-xl" aria-hidden="true">
        <defs>
          <linearGradient id="history-ring" x1="20" x2="96" y1="18" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7F77DD" />
            <stop offset="0.55" stopColor="#1D9E75" />
            <stop offset="1" stopColor="#D85A30" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer dashed rotating ring */}
        <motion.circle
          cx="60" cy="60" r="42"
          fill="none"
          stroke="url(#history-ring)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.4"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ originX: "60px", originY: "60px" }}
        />

        {/* Inner solid ring */}
        <circle cx="60" cy="60" r="30" fill="rgba(255,255,255,0.85)" className="dark:fill-white/10" stroke="rgba(22,22,22,0.1)" strokeWidth="1" />

        {/* Clock Hands */}
        <motion.path
          d="M60 60 L60 42"
          fill="none"
          stroke="url(#history-ring)"
          strokeLinecap="round"
          strokeWidth="4"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{ originX: "60px", originY: "60px" }}
        />
        <motion.path
          d="M60 60 L72 68"
          fill="none"
          stroke="#161616"
          className="dark:stroke-white/80"
          strokeLinecap="round"
          strokeWidth="3"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ originX: "60px", originY: "60px" }}
        />

        {/* Center dot */}
        <circle cx="60" cy="60" r="3" fill="#161616" className="dark:fill-white" />
      </svg>
    </div>
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
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-panel-strong relative overflow-hidden rounded-[2.5rem] p-12 text-center shadow-panel"
      >
        {/* Background gradient mesh */}
        <div className="absolute inset-x-0 -top-40 -z-10 h-80 opacity-20 blur-[100px] bg-gradient-to-r from-dev via-life to-biz" />

        <div className="mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-[2rem] bg-white/50 shadow-sm backdrop-blur-md dark:bg-white/5">
          <EmptyHistoryIllustration />
        </div>

        <h2 className="font-display text-4xl leading-tight sm:text-5xl gradient-text bg-clip-text text-transparent pb-1">
          Historial en blanco
        </h2>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-black/60 dark:text-white/60">
          Aún no hay automatizaciones ejecutadas. Cuando lances una receta desde el catálogo, aparecerá aquí con acceso a sus resultados.
        </p>

        <div className="mt-8">
          <Link
            href="/catalog"
            className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-8 py-3.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-black hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <span>Explorar catálogo</span>
            <motion.span
              className="inline-block"
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
            >
              →
            </motion.span>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((execution, index) => {
        const categoryLabel = recipeCategoryById[execution.recipeId] || "biz";
        const category = categoryMeta[categoryLabel as RecipeCategory];

        return (
          <motion.div
            key={execution.executionId}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
            className="glass-panel group relative overflow-hidden rounded-[1.75rem] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-panel-lg"
          >
            {/* Subtle category hover glow */}
            <div
              className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `linear-gradient(90deg, ${category.color}, transparent)` }}
            />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-semibold">{execution.recipeTitle}</p>
                <div className="mt-2 flex items-center gap-3 text-sm text-black/55 dark:text-white/55">
                  <span className={`inline-block h-2 w-2 rounded-full`} style={{ backgroundColor: category.color }} />
                  {new Intl.DateTimeFormat("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(new Date(execution.createdAt))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm backdrop-blur dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {execution.status}
                </span>

                <Link
                  href={`/results/${execution.executionId}`}
                  className="rounded-full border border-black/10 bg-white/60 px-5 py-2 text-sm font-semibold shadow-sm transition-all hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
                >
                  Ver resultados
                </Link>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
