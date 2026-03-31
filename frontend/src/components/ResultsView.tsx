"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import { useToast } from "@/components/providers/AppProviders";
import { categoryMeta, recipeCategoryById } from "@/lib/category";
import { getExecution } from "@/lib/api";
import type { Execution } from "@/lib/types";

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
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="h-40 rounded-[1.5rem] bg-black/5 dark:bg-white/5"
        />
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

function getScoreLabel(score: number) {
  if (score < 40) return "Critico";
  if (score < 70) return "Mejorable";
  return "Solido";
}

function getScoreToneClassName(score: number) {
  if (score < 40) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
  }

  if (score < 70) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
}

function getScoreSummary(score: number) {
  if (score < 40) {
    return "La pagina necesita una revision fuerte de claridad, estructura y conversion.";
  }

  if (score < 70) {
    return "Hay una base util, pero todavia hay friccion visible en mensaje y CTA.";
  }

  return "La landing transmite bien el valor y solo necesita ajustes finos.";
}

function getInputUrl(input: Execution["input"]) {
  const rawValue = input.url;
  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function getHostLabel(url: string) {
  if (!url) return "";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function ResultsView({ executionId }: ResultsViewProps) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
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

  async function copyText(value: string, token: string) {
    await navigator.clipboard.writeText(value);
    setCopiedToken(token);
    showToast("Copiado al portapapeles");
    window.setTimeout(() => {
      setCopiedToken((currentToken) => (currentToken === token ? null : currentToken));
    }, 2000);
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
  const landingReport =
    execution.recipeId === "landing-page-analyzer" && execution.result.type === "report"
      ? execution.result
      : null;
  const isLandingReport = landingReport !== null;
  const fullAnalyzedUrl = landingReport ? getInputUrl(execution.input) : "";
  const analyzedHost = getHostLabel(fullAnalyzedUrl) || "landing analizada";
  const landingSections = landingReport?.sections || [];
  const scoreLabel = landingReport ? getScoreLabel(landingReport.score) : "";
  const scoreToneClassName = landingReport ? getScoreToneClassName(landingReport.score) : "";
  const landingSummary = landingReport
    ? `Analisis de landing para ${analyzedHost}. Revisamos copy, estructura y propuesta de valor para detectar los puntos que mas afectan claridad y conversion.`
    : "";
  const textResult = execution.result.type === "text" ? execution.result : null;
  const textContext =
    textResult?.context && typeof textResult.context === "object"
      ? textResult.context
      : null;
  const rssThemes = Array.isArray(textContext?.themes)
    ? textContext.themes.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const rssHighlights = Array.isArray(textContext?.highlights)
    ? textContext.highlights.filter((item): item is { title?: string; source?: string; url?: string; note?: string } => !!item && typeof item === "object")
    : [];
  const rssSources = Array.isArray(textContext?.sources)
    ? textContext.sources.filter((item): item is { title?: string; source?: string; url?: string } => !!item && typeof item === "object")
    : [];
  const rssArticlesFound = Number(textContext?.articlesFound || 0);
  const rssTopic = typeof textContext?.topic === "string" ? textContext.topic.trim() : "";
  const rssSummary = typeof textContext?.summary === "string" ? textContext.summary.trim() : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      {/* ── Success Banner ─── */}
      {isLandingReport ? (
        <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-panel dark:border-white/10 dark:bg-[#11161d]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent-color)] to-transparent opacity-70"
            style={{ "--accent-color": category.color } as CSSProperties}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-black/58 dark:text-white/58">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckIcon />
                  </span>
                  Automatizacion completada
                </span>
                <span>{formattedDate}</span>
                <span>modo {execution.mode || "live"}</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/42 dark:text-white/42">
                  Dominio analizado
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-black dark:text-white sm:text-4xl">
                  {analyzedHost}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-black/68 dark:text-white/68">
                  Vista editorial para leer rapido el diagnostico, entender el nivel actual de la landing y bajar a hallazgos accionables por criterio.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Score actual
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.04em] text-black dark:text-white">
                    {landingReport?.score ?? 0}
                  </span>
                  <span className="pb-1 text-sm text-black/48 dark:text-white/48">/100</span>
                </div>
                <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${scoreToneClassName}`}>
                  {scoreLabel}
                </span>
              </div>

              <div className="rounded-[1.5rem] border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Ejecucion
                </p>
                <p className="mt-4 text-lg font-semibold text-black dark:text-white">
                  {execution.recipeTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/62 dark:text-white/62">
                  ID {execution.executionId.split("-").pop()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-300 bg-emerald-50/90 p-8 shadow-panel dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute -left-10 -top-10 h-32 w-32 animate-[pulse-glow_4s_infinite] rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-500/10" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 animate-[pulse-glow_5s_infinite] rounded-full bg-emerald-400/20 blur-xl dark:bg-emerald-400/10" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
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
              ID: {execution.executionId.split("-").pop()}
            </div>
          </div>
        </div>
      )}

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
                imageUrl={post.imageUrl}
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
        isLandingReport ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-black/10 bg-white/92 p-8 shadow-panel dark:border-white/10 dark:bg-[#11161d]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Resumen ejecutivo
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-black dark:text-white">
                  Analisis de landing para {analyzedHost}
                </h2>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-black/74 dark:text-white/74">
                  {landingSummary}
                </p>

                {fullAnalyzedUrl ? (
                  <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                          URL analizada
                        </p>
                        <p className="mt-2 break-all text-sm leading-7 text-black/68 dark:text-white/68">
                          {fullAnalyzedUrl}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => void copyText(fullAnalyzedUrl, "landing-url")}
                        className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                          copiedToken === "landing-url"
                            ? "bg-emerald-500 text-white"
                            : "border border-black/10 bg-white text-black hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        }`}
                      >
                        {copiedToken === "landing-url" ? <CheckIcon /> : <ClipboardIcon />}
                        {copiedToken === "landing-url" ? "URL copiada" : "Copiar URL"}
                      </motion.button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {landingSections.map((section, idx) => (
                  <motion.article
                    key={section.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * idx }}
                    className="rounded-[1.75rem] border border-black/10 bg-white/92 p-7 shadow-sm dark:border-white/10 dark:bg-[#11161d]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h3 className="text-xl font-semibold tracking-[-0.02em] text-black dark:text-white">
                        {section.title}
                      </h3>
                      {section.score !== undefined ? (
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getScoreToneClassName(section.score)}`}>
                          {section.score}/100
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-5 max-w-3xl text-[15px] leading-8 text-black/74 dark:text-white/74">
                      {section.content}
                    </p>
                  </motion.article>
                ))}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-black/10 bg-white/92 p-6 shadow-sm dark:border-white/10 dark:bg-[#11161d]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Lectura rapida
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    {landingReport?.score ?? 0}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-black dark:text-white">{scoreLabel}</p>
                    <p className="mt-1 text-sm leading-6 text-black/64 dark:text-white/64">
                      {getScoreSummary(landingReport?.score ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-black/10 bg-white/92 p-6 shadow-sm dark:border-white/10 dark:bg-[#11161d]">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Acciones prioritarias
                </h2>
                {landingReport?.recommendations?.length ? (
                  <ol className="mt-5 space-y-3">
                    {landingReport.recommendations.map((recommendation, index) => (
                      <motion.li
                        key={recommendation}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 * index }}
                        className="flex gap-4 rounded-[1.25rem] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          {index + 1}
                        </span>
                        <span className="text-sm leading-7 text-black/72 dark:text-white/72">
                          {recommendation}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-black/64 dark:text-white/64">
                    No llegaron recomendaciones adicionales en esta ejecucion.
                  </p>
                )}
              </div>
            </aside>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.7fr_1fr]">
            <div className="glass-panel-strong flex flex-col items-center justify-center rounded-[2rem] p-8 text-center shadow-panel">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">Score general</p>
              <ScoreRing score={execution.result.score} color={category.color} />
              <h2 className="mt-8 text-xl font-semibold">{execution.result.headline}</h2>

              {execution.result.recommendations?.length ? (
                <div className="mt-8 w-full text-left">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">Prioridades</p>
                  <ul className="space-y-3">
                    {execution.result.recommendations.map((recommendation, i) => (
                      <motion.li
                        key={recommendation}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex gap-3 rounded-xl bg-black/5 p-3 text-sm leading-6 text-black/70 dark:bg-white/5 dark:text-white/70"
                      >
                        <span className="text-[color:var(--accent-color)]" style={{ "--accent-color": category.color } as CSSProperties}>✦</span>
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
                    <h2 className="text-lg font-semibold transition-colors group-hover:text-[color:var(--accent-color)]" style={{ "--accent-color": category.color } as CSSProperties}>{section.title}</h2>
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
        )
      ) : null}

      {/* ── Text Pattern ─── */}
      {execution.result.type === "text" ? (
        execution.recipeId === "rss-news-digest" ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-8 lg:p-10 shadow-panel group">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[color:var(--accent-color)] to-transparent opacity-60" style={{ "--accent-color": category.color } as CSSProperties} />
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
                    Briefing
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
                    {rssTopic || "Boletín de noticias"}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-black/64 dark:text-white/64">
                    {rssSummary || textResult?.content}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => void copyText(textResult?.content || "", "text-result")}
                  className={`inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${copiedToken === "text-result" ? 'bg-emerald-500 text-white' : category.buttonClassName}`}
                >
                  {copiedToken === "text-result" ? <CheckIcon /> : <ClipboardIcon />}
                  {copiedToken === "text-result" ? "Copiado al portapapeles" : "Copiar briefing"}
                </motion.button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                    Artículos
                  </p>
                  <p className="mt-3 text-4xl font-semibold">{rssArticlesFound}</p>
                </div>
                <div className="rounded-[1.5rem] border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                    Ángulos clave
                  </p>
                  <p className="mt-3 text-4xl font-semibold">{rssThemes.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                    Fuentes
                  </p>
                  <p className="mt-3 text-4xl font-semibold">{rssSources.length}</p>
                </div>
              </div>

              {rssThemes.length ? (
                <div className="mt-8 rounded-[1.75rem] border border-black/10 bg-white/50 p-6 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                    Ángulos clave
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {rssThemes.map((theme) => (
                      <span
                        key={theme}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${category.softClassName}`}
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {rssHighlights.length ? (
                <div className="mt-8 space-y-3">
                  {rssHighlights.map((item, index) => (
                    <motion.a
                      key={`${item.title}-${index + 1}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * index }}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[1.5rem] border border-black/10 bg-white/55 p-5 transition hover:border-black/20 hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-black dark:text-white">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-black/62 dark:text-white/62">
                            {item.source || "Fuente no identificada"}{item.note ? ` · ${item.note}` : ""}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-black/42 dark:text-white/42">
                          Abrir
                        </span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-2xl bg-white/50 p-6 shadow-inner dark:bg-black/20">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black/80 dark:text-white/80">
                    {textResult?.content}
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-black/10 bg-white/92 p-6 shadow-sm dark:border-white/10 dark:bg-[#11161d]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/42 dark:text-white/42">
                  Fuentes principales
                </p>
                {rssSources.length ? (
                  <div className="mt-4 space-y-3">
                    {rssSources.slice(0, 6).map((source, index) => (
                      <a
                        key={`${source.title}-${index + 1}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-[1.25rem] border border-black/10 bg-black/[0.02] p-4 transition hover:border-black/20 hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                      >
                        <p className="text-sm font-semibold leading-6 text-black dark:text-white">{source.title}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-black/42 dark:text-white/42">
                          {source.source || "Fuente no identificada"}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-black/64 dark:text-white/64">
                    No se detectaron fuentes enlazables en esta ejecución.
                  </p>
                )}
              </div>
            </aside>
          </section>
        ) : (
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
                      onClick={() => void copyText(textResult.content, "text-result")}
                      className={`inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors ${copiedToken === "text-result" ? 'bg-emerald-500 text-white' : category.buttonClassName}`}
                    >
                      {copiedToken === "text-result" ? <CheckIcon /> : <ClipboardIcon />}
                      {copiedToken === "text-result" ? "Copiado al portapapeles" : "Copiar texto"}
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
        )
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
