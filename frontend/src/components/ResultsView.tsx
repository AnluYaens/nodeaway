"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import { useToast } from "@/components/providers/AppProviders";
import { categoryMeta, recipeCategoryById } from "@/lib/category";
import { getExecution } from "@/lib/api";
import type { Execution, RecipeCategory } from "@/lib/types";

import { PostPreview } from "./PostPreview";

type ResultsViewProps = {
  executionId: string;
};

/* ── Animated Number Counter Component ─── */
function AnimatedNumber({ value }: { value: string | number }) {
  const isNumber = !isNaN(Number(value));
  const numericValue = isNumber ? Number(value) : 0;

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isNumber) {
      const animation = animate(count, numericValue, { duration: 1.5, ease: "easeOut" });
      return animation.stop;
    }
  }, [isNumber, numericValue, count]);

  return <>{isNumber ? <motion.span>{rounded}</motion.span> : value}</>;
}

/* ── Animated Score Ring Component ─── */
function ScoreRing({ score, color }: { score: number, color: string }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-[120px] w-[120px] -rotate-90 transform" viewBox="0 0 120 120">
        <circle
          className="stroke-black/5 dark:stroke-white/5"
          fill="none"
          strokeWidth="8"
          r={radius}
          cx="60"
          cy="60"
        />
        <circle
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference} /* Start empty */
          r={radius}
          cx="60"
          cy="60"
          style={{
            stroke: color,
            animation: "score-ring 1.5s ease-out forwards",
            animationDelay: "0.2s"
          }}
          className="[--ring-circumference:289px]"
        />
      </svg>
      {/* Insert actual offset as a custom property after animation */}
      <style suppressHydrationWarning>{`
        circle { --ring-offset: ${offset}px; }
      `}</style>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">
          <AnimatedNumber value={score} />
        </span>
        <span className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">
          /100
        </span>
      </div>
    </div>
  );
}


function LoadingState() {
  return (
    <div className="glass-panel-strong rounded-[2rem] p-8 shadow-panel">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
        <p className="text-sm font-medium text-black/60 dark:text-white/60">Preparando resultados premium</p>
      </div>
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0.4, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.1, repeat: Infinity, repeatType: "reverse" }}
          className="h-2 origin-left rounded-full bg-gradient-to-r from-dev via-life to-biz"
        />
        <div className="h-40 animate-pulse rounded-[1.5rem] bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M9 4.75h6M9.75 3h4.5A1.75 1.75 0 0 1 16 4.75v.5H8v-.5A1.75 1.75 0 0 1 9.75 3Z" />
      <path d="M8 5.25H6.75A1.75 1.75 0 0 0 5 7v11.25C5 19.22 5.78 20 6.75 20h10.5c.97 0 1.75-.78 1.75-1.75V7c0-.97-.78-1.75-1.75-1.75H16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m5 12.5 4.2 4.2L19 7.5" />
    </svg>
  );
}

export function ResultsView({ executionId }: ResultsViewProps) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

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
    if (!execution) return "";

    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(execution.createdAt));
  }, [execution]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    showToast("Copiado al portapapeles");
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error || !execution) {
    return (
      <div className="rounded-[2rem] border border-rose-300 bg-rose-50 p-8 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        {error || "No se encontró esta ejecución."}
      </div>
    );
  }

  const category = categoryMeta[recipeCategoryById[execution.recipeId] || "biz"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      {/* ── Premium Success Banner ─── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-300 bg-emerald-50/90 p-8 shadow-panel dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-10 -top-10 h-32 w-32 animate-[pulse-glow_4s_infinite] rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-500/10" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 animate-[pulse-glow_5s_infinite] rounded-full bg-emerald-400/20 blur-xl dark:bg-emerald-400/10" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                <CheckIcon />
              </div>
              <p className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200">
                Automatización completada
              </p>
            </div>
            <h1 className="mt-2 font-display text-5xl leading-none text-emerald-950 dark:text-white sm:text-6xl">
              {execution.recipeTitle}
            </h1>
            <p className="mt-3 text-sm text-emerald-800/70 dark:text-emerald-100/70">
              {formattedDate} · modo {execution.mode || "live"}
            </p>
          </div>
          <div className="rounded-full border border-emerald-700/20 bg-white/80 px-5 py-2.5 text-xs font-medium tracking-wide text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-200/20 dark:bg-black/20 dark:text-emerald-100">
            ID: {execution.executionId.split('-').pop()}
          </div>
        </div>
      </div>

      {/* ── Social Posts Pattern ─── */}
      {execution.result.type === "social-posts" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {execution.result.posts.map((post, index) => (
            <motion.div
              key={`${post.platform}-${index + 1}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="h-full"
            >
              <PostPreview
                brandName={post.brandName}
                platform={post.platform}
                text={post.text}
                hashtags={post.hashtags}
                imagePrompt={post.imagePrompt}
                imageBase64={post.imageBase64}
              />
            </motion.div>
          ))}
        </section>
      ) : null}

      {/* ── Dashboard Pattern ─── */}
      {execution.result.type === "dashboard" ? (
        <section className="space-y-6">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08 } }
            }}
            className="grid gap-5 md:grid-cols-3"
          >
            {execution.result.stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, scale: 0.95, y: 18 },
                  show: { opacity: 1, scale: 1, y: 0 }
                }}
                transition={{ duration: 0.35, type: "spring", stiffness: 100 }}
                className="glass-panel group relative overflow-hidden rounded-[1.75rem] p-6 shadow-panel transition-all hover:shadow-panel-lg"
              >
                <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-[color:var(--accent-color)] opacity-5 blur-2xl transition-opacity group-hover:opacity-10" style={{ "--accent-color": category.color } as CSSProperties} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
                  {stat.label}
                </p>
                <p className="mt-4 font-display text-5xl">
                  <AnimatedNumber value={stat.value} />
                </p>
                {stat.trend && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${stat.trend.includes('arriba') || stat.trend.includes('mejor') ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-black/60 dark:text-white/60">{stat.trend}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          <div className="glass-panel-strong rounded-[2rem] p-8 lg:p-10 shadow-panel">
            <h2 className="text-xl font-semibold mb-4 text-[color:var(--accent-color)]" style={{ "--accent-color": category.color } as CSSProperties}>Resumen ejecutivo</h2>
            <p className="text-sm md:text-base leading-relaxed text-black/75 dark:text-white/75 border-l-2 pl-4 border-[color:var(--accent-color)]" style={{ "--accent-color": category.color } as CSSProperties}>
              {execution.result.summary}
            </p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06 } }
              }}
              className="mt-8 grid gap-4 lg:grid-cols-2"
            >
              {execution.result.items.map((item) => (
                <motion.div
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0 }
                  }}
                  className="group rounded-[1.25rem] border border-black/5 bg-white/40 p-5 shadow-sm transition-colors hover:bg-white/60 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-base font-semibold group-hover:text-[color:var(--accent-color)] transition-colors" style={{ "--accent-color": category.color } as CSSProperties}>{item.title}</p>
                    <span className={`flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${category.softClassName}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">{item.reason}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ── Report Pattern ─── */}
      {execution.result.type === "report" ? (
        <section className="grid gap-6 xl:grid-cols-[0.7fr_1fr]">
          <div className="glass-panel-strong flex flex-col items-center justify-center text-center rounded-[2rem] p-8 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45 mb-6">Score general</p>
            <ScoreRing score={execution.result.score} color={category.color} />
            <h2 className="mt-8 text-xl font-semibold">{execution.result.headline}</h2>

            {execution.result.recommendations?.length ? (
              <div className="mt-8 w-full text-left">
                <p className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mb-4 font-semibold">Prioridades</p>
                <ul className="space-y-3">
                  {execution.result.recommendations.map((recommendation, i) => (
                    <motion.li
                      key={recommendation}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex gap-3 text-sm leading-6 text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/5 p-3 rounded-xl"
                    >
                      <span className={`text-[color:var(--accent-color)]`} style={{ "--accent-color": category.color } as CSSProperties}>✦</span>
                      <span>{recommendation}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            {execution.result.sections.map((section, idx) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="glass-panel group rounded-[2rem] p-7 shadow-sm transition-all hover:shadow-panel"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold group-hover:text-[color:var(--accent-color)] transition-colors" style={{ "--accent-color": category.color } as CSSProperties}>{section.title}</h2>
                  {section.score !== undefined ? (
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${category.softClassName}`}>
                      {section.score}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-black/70 dark:text-white/70">{section.content}</p>
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Text Pattern ─── */}
      {execution.result.type === "text" ? (
        <section className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-8 lg:p-10 shadow-panel group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[color:var(--accent-color)] to-transparent opacity-60" style={{ "--accent-color": category.color } as CSSProperties} />
          {(() => {
            const textResult = execution.result;
            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <h2 className="text-2xl font-semibold">Texto generado</h2>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => void copyText(textResult.content)}
                    className={`inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${copied ? 'bg-emerald-500 text-white' : category.buttonClassName}`}
                  >
                    {copied ? <CheckIcon /> : <ClipboardIcon />}
                    {copied ? "Copiado al portapapeles" : "Copiar texto"}
                  </motion.button>
                </div>
                <div className="mt-8 rounded-2xl bg-white/50 p-6 shadow-inner dark:bg-black/20">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black/80 dark:text-white/80">
                    {textResult.content}
                  </p>
                </div>
              </>
            );
          })()}
        </section>
      ) : null}

      {/* ── Actions ─── */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-black/10 dark:border-white/10">
        <Link
          href={`/run/${execution.recipeId}`}
          className={`inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 ${category.buttonClassName}`}
        >
          Ejecutar de nuevo
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white/50 px-6 py-3.5 text-sm font-semibold text-black/75 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-black/25 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:border-white/25 dark:hover:bg-white/10"
        >
          Explorar catálogo
        </Link>
      </div>
    </motion.div>
  );
}
