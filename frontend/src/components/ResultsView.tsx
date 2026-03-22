"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import { getExecution } from "@/lib/api";
import type { Execution } from "@/lib/types";

import { PostPreview } from "./PostPreview";

type ResultsViewProps = {
  executionId: string;
};

function LoadingState() {
  return (
    <div className="rounded-[2rem] border border-black/10 bg-white/75 p-8 shadow-panel dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-emerald-500" />
        <p className="text-sm font-medium text-black/60 dark:text-white/60">Preparando resultados</p>
      </div>
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0.4, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.1, repeat: Infinity, repeatType: "reverse" }}
          className="h-2 origin-left rounded-full bg-gradient-to-r from-dev via-life to-biz"
        />
        <div className="h-32 animate-pulse rounded-[1.5rem] bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function ResultsView({ executionId }: ResultsViewProps) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadExecution() {
      try {
        setLoading(true);
        setError(null);
        const data = await getExecution(executionId);
        if (!cancelled) {
          setExecution(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el resultado.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadExecution();
    return () => {
      cancelled = true;
    };
  }, [executionId]);

  const formattedDate = useMemo(() => {
    if (!execution) {
      return "";
    }

    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(execution.createdAt));
  }, [execution]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error || !execution) {
    return (
      <div className="rounded-[2rem] border border-rose-300 bg-rose-50 p-8 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        {error || "No se encontro esta ejecucion."}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <div className="rounded-[2rem] border border-emerald-300 bg-emerald-50/90 p-6 shadow-panel dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
              Automatizacion completada con exito
            </p>
            <h1 className="mt-2 font-display text-5xl leading-none text-emerald-950 dark:text-white">
              {execution.recipeTitle}
            </h1>
            <p className="mt-3 text-sm text-emerald-800/70 dark:text-emerald-100/70">
              {formattedDate} · modo {execution.mode || "live"}
            </p>
          </div>
          <div className="rounded-full border border-emerald-700/15 bg-white/70 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-200/15 dark:bg-white/5 dark:text-emerald-100">
            Execution ID: {execution.executionId}
          </div>
        </div>
      </div>

      {execution.result.type === "social-posts" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {execution.result.posts.map((post, index) => (
            <PostPreview
              key={`${post.platform}-${index + 1}`}
              brandName={post.brandName}
              platform={post.platform}
              text={post.text}
              hashtags={post.hashtags}
              imageBase64={post.imageBase64}
            />
          ))}
        </section>
      ) : null}

      {execution.result.type === "dashboard" ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {execution.result.stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-panel dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
                  {stat.label}
                </p>
                <p className="mt-3 text-4xl font-semibold">{stat.value}</p>
                <p className="mt-2 text-sm text-black/55 dark:text-white/55">{stat.trend || "sin cambio"}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-panel dark:border-white/10 dark:bg-white/5">
            <p className="text-sm leading-7 text-black/70 dark:text-white/70">{execution.result.summary}</p>
            <div className="mt-6 space-y-4">
              {execution.result.items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.25rem] border border-black/10 p-4 dark:border-white/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-base font-semibold">{item.title}</p>
                    <span className="rounded-full bg-dev/10 px-3 py-1 text-xs font-medium text-dev">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {execution.result.type === "report" ? (
        <section className="grid gap-6 xl:grid-cols-[0.7fr_1fr]">
          <div className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-panel dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">Score general</p>
            <p className="mt-3 text-6xl font-semibold">{execution.result.score}</p>
            <p className="mt-4 text-sm leading-7 text-black/65 dark:text-white/65">
              {execution.result.headline}
            </p>
            {execution.result.recommendations?.length ? (
              <ul className="mt-6 space-y-3 text-sm leading-6 text-black/68 dark:text-white/68">
                {execution.result.recommendations.map((recommendation) => (
                  <li key={recommendation} className="rounded-2xl border border-black/10 px-4 py-3 dark:border-white/10">
                    {recommendation}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="space-y-4">
            {execution.result.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-panel dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  {section.score !== undefined ? (
                    <span className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white dark:bg-white dark:text-black">
                      {section.score}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-black/65 dark:text-white/65">{section.content}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {execution.result.type === "text" ? (
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-panel dark:border-white/10 dark:bg-white/5">
          {(() => {
            const textResult = execution.result;
            return (
              <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Texto generado</h2>
            <button
              type="button"
              onClick={() => void copyText(textResult.content)}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-8 text-black/72 dark:text-white/72">
            {textResult.content}
          </p>
              </>
            );
          })()}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/run/${execution.recipeId}`}
          className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          Ejecutar de nuevo
        </Link>
        <Link
          href="/catalog"
          className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-black/72 transition hover:border-black/20 dark:border-white/10 dark:text-white/72 dark:hover:border-white/20"
        >
          Otra automatizacion
        </Link>
      </div>
    </motion.div>
  );
}
