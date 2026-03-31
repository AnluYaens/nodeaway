"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";

import { categoryMeta } from "@/lib/category";
import { getRecipe, runAutomation } from "@/lib/api";
import type { Field, Recipe } from "@/lib/types";

function ResultPreviewIcon({ type }: { type: Recipe["resultTemplate"]["type"] }) {
  if (type === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M4 19h16" />
        <path d="M7 15V9" />
        <path d="M12 15V6" />
        <path d="M17 15v-3" />
      </svg>
    );
  }

  if (type === "report") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M8 4.75h5.5L18 9.25V19a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 19V6.25A1.5 1.5 0 0 1 8.5 4.75Z" />
        <path d="M13.5 4.75v4.5H18" />
        <path d="M10 12h5M10 15.5h4" />
      </svg>
    );
  }

  if (type === "social-posts") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
        <path d="m8 15 2.5-2.5 2.5 2.5 3.5-4 2.5 4" />
        <circle cx="9" cy="9.5" r="1.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M7 5.5h10A1.5 1.5 0 0 1 18.5 7v10a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z" />
      <path d="M8.5 9.5h7M8.5 12h7M8.5 14.5h4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2.5] text-white">
      <path d="m5 12.5 4.2 4.2L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DynamicFormProps = {
  recipeId: string;
};

export function DynamicForm({ recipeId }: DynamicFormProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const loadingMessages = [
    "Preparando automatización...",
    "Procesando datos...",
    "Generando resultados..."
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadRecipe() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecipe(recipeId);
        if (!cancelled) {
          setRecipe(data);
          const initialValues = Object.fromEntries(
            data.fields.map((field) => [field.id, field.default ? String(field.default) : ""])
          );
          setValues(initialValues);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la automatización.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  useEffect(() => {
    if (!submitting) {
      setProgressStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setProgressStep((current) => Math.min(current + 1, loadingMessages.length - 1));
    }, 1800);

    return () => {
      window.clearInterval(interval);
    };
  }, [submitting, loadingMessages.length]);

  const missingFields = useMemo(() => {
    if (!recipe) return [];
    return recipe.fields
      .filter((field) => field.required && !values[field.id]?.trim())
      .map((field) => field.label);
  }, [recipe, values]);

  const resultPreview = useMemo(() => {
    if (!recipe) return null;

    const featureLabels: Record<string, string> = {
      metrics: "estadísticas clave",
      "priority-list": "prioridades ordenadas",
      "copy-summary": "resumen accionable",
      score: "score general",
      sections: "análisis por bloques",
      recommendations: "recomendaciones concretas",
      insights: "insights rápidos",
      "copy-text": "texto listo para copiar",
      share: "entrega lista para compartir",
      regenerate: "variantes listas para iterar",
      "download-image": "imagen generada",
      "download-zip": "pack descargable",
      "platform-copies": "copies por plataforma",
      "image-prompts": "prompts visuales",
      "ready-to-publish": "posts listos para publicar",
      sentiment: "sentimiento agregado",
      "pros-cons": "pros y contras",
      "health-metrics": "métricas de salud",
      "technical-debt": "deuda técnica visible",
      triage: "clasificación por urgencia",
      headlines: "titulares clave",
      briefing: "briefing matutino",
      "actionable-summary": "cierre accionable",
      "cta-review": "análisis de CTA"
    };

    const defaultSummaryByType: Record<Recipe["resultTemplate"]["type"], string> = {
      dashboard: "Recibirás: resumen priorizado + estadísticas",
      report: "Recibirás: score general + recomendaciones",
      "social-posts": "Recibirás: copies + hashtags + creatividades",
      text: "Recibirás: texto final listo para copiar"
    };

    const detailByType: Record<Recipe["resultTemplate"]["type"], string> = {
      dashboard: "Ideal para revisar señales clave y decidir qué atacar primero.",
      report: "Pensado para darte contexto, evaluación y próximos pasos en una sola vista.",
      "social-posts": "Obtendrás varias piezas listas para publicar o ajustar a tu tono.",
      text: "Verás una salida directa, limpia y preparada para copiar o reutilizar."
    };

    const featureSummary = recipe.resultTemplate.features
      .map((feature) => featureLabels[feature])
      .filter(Boolean)
      .slice(0, 3)
      .join(" + ");

    return {
      title: featureSummary ? `Recibirás: ${featureSummary}` : defaultSummaryByType[recipe.resultTemplate.type],
      detail: detailByType[recipe.resultTemplate.type],
      chips: recipe.resultTemplate.features
        .map((feature) => featureLabels[feature])
        .filter(Boolean)
        .slice(0, 4)
    };
  }, [recipe]);

  function renderResultPreview() {
    if (!recipe || !resultPreview) return null;

    if (recipe.resultTemplate.type === "dashboard") {
      const dashboardStats =
        recipe.id === "github-health-auditor"
          ? [
            ["Score salud", "82/100"],
            ["Issues abiertos", "14"],
            ["Commits recientes", "9"]
          ]
          : [
            ["Issues abiertos", "30"],
            ["Urgencia alta", "5"],
            ["Sin etiquetar", "7"]
          ];
      const dashboardItems =
        recipe.id === "github-health-auditor"
          ? ["Actualizar dependencias críticas", "Reducir deuda en onboarding", "Mejorar cobertura de pruebas"]
          : ["Error de autenticación", "Build roto en release", "Bug visual en mobile"];

      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {dashboardStats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-[0.65rem] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                  {label}
                </p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.5rem] border border-dashed border-black/15 p-4 dark:border-white/15">
            <p className="text-sm font-medium">Lista priorizada</p>
            <div className="mt-3 space-y-2">
              {dashboardItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.04]"
                >
                  <span className="text-sm text-black/68 dark:text-white/68">{item}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${categoryMeta[recipe.category as keyof typeof categoryMeta].softClassName}`}>
                    Alta
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (recipe.resultTemplate.type === "report") {
      const reportItems =
        recipe.id === "reddit-opinion-radar"
          ? ["Pros recurrentes", "Contras recurrentes", "Sentimiento general"]
          : ["Propuesta de valor", "Estructura y CTA", "Recomendaciones prioritarias"];

      return (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
              Score estimado
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-5xl font-semibold">84</p>
              <p className="pb-2 text-sm text-black/52 dark:text-white/52">/100</p>
            </div>
            <p className="mt-3 text-sm text-black/60 dark:text-white/60">
              Verás hallazgos, riesgos y recomendaciones concretas.
            </p>
          </div>
          <div className="space-y-2">
            {reportItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-black/68 dark:border-white/10 dark:text-white/68"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (recipe.resultTemplate.type === "social-posts") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {["Instagram", "Twitter/X", "LinkedIn"].map((label) => (
              <div
                key={label}
                className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
              >
                <div
                  className="h-24"
                  style={{
                    background: `linear-gradient(135deg, ${categoryMeta[recipe.category as keyof typeof categoryMeta].color}28, rgba(255,255,255,0.86))`
                  }}
                />
                <div className="space-y-2 p-4">
                  <p className="text-sm font-medium">Post para {label}</p>
                  <p className="text-xs leading-6 text-black/58 dark:text-white/58">
                    Copy, hashtags y prompt visual listos para revisar o publicar.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium">
            {recipe.id === "rss-news-digest" ? "Vista previa del boletín" : "Vista previa del texto"}
          </p>
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full rounded-full bg-black/8 dark:bg-white/10" />
            <div className="h-2 w-[88%] rounded-full bg-black/8 dark:bg-white/10" />
            <div className="h-2 w-[70%] rounded-full bg-black/8 dark:bg-white/10" />
            <div className="h-2 w-[82%] rounded-full bg-black/8 dark:bg-white/10" />
          </div>
        </div>
        <p className="text-sm leading-7 text-black/58 dark:text-white/58">
          {recipe.id === "rss-news-digest"
            ? "Recibirás un briefing listo para leer, copiar o reutilizar en tu rutina diaria."
            : "Los resultados aparecerán aquí al ejecutar, con una salida lista para copiar o compartir."}
        </p>
      </div>
    );
  }

  function updateValue(fieldId: string, value: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recipe) return;

    if (missingFields.length > 0) {
      setError(`Completa los campos requeridos: ${missingFields.join(", ")}.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = recipe.fields.reduce<Record<string, string | number>>((accumulator, field) => {
        const value = values[field.id];
        if (!value) return accumulator;

        accumulator[field.id] = field.type === "number" ? Number(value) : value;
        return accumulator;
      }, {});

      const response = await runAutomation(recipe.id, payload);
      router.push(`/results/${response.executionId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "No se pudo ejecutar la automatización."
      );
      setSubmitting(false); // Only set to false on error, keep true for success redirect
    }
  }

  function renderField(field: Field) {
    const isFocused = focusedField === field.id;
    const hasValue = !!values[field.id];
    const isActive = isFocused || hasValue;
    const categoryColor = recipe ? categoryMeta[recipe.category as keyof typeof categoryMeta].color : "#000";

    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      value: values[field.id] || "",
      placeholder: `${field.label} ${field.required ? '*' : ''}`,
      onFocus: () => setFocusedField(field.id),
      onBlur: () => setFocusedField(null),
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        updateValue(field.id, event.target.value),
      className: `
        peer w-full rounded-2xl border bg-white/70 px-4 py-4 text-sm outline-none transition-all duration-300
        dark:bg-white/5 placeholder:text-black/40 dark:placeholder:text-white/40
        ${isFocused ? 'border-transparent bg-white dark:bg-white/10' : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'}
        ${field.type === 'select' && !hasValue ? 'text-black/40 dark:text-white/40' : 'text-black dark:text-white'}
      `
    };

    let inputElement;
    if (field.type === "textarea") {
      inputElement = <textarea {...commonProps} rows={4} className={`${commonProps.className} resize-none min-h-[120px]`} />;
    } else if (field.type === "select") {
      inputElement = (
        <select {...commonProps}>
          <option value="" disabled className="text-black dark:bg-night dark:text-white">Selecciona una opción</option>
          {field.options?.map((option) => (
            <option key={option} value={option} className="text-black dark:bg-night dark:text-white">
              {option}
            </option>
          ))}
        </select>
      );
    } else {
      inputElement = (
        <input
          {...commonProps}
          type={field.type === "url" ? "url" : field.type}
          min={field.min}
          max={field.max}
        />
      );
    }

    return (
      <div className="relative group flex flex-col">
        {inputElement}
        {/* Glow behind the input on focus */}
        {isFocused && (
          <motion.div
            layoutId="focus-glow"
            className="pointer-events-none absolute -inset-[1px] -z-10 rounded-2xl opacity-40 blur-sm mix-blend-multiply dark:mix-blend-screen"
            style={{ backgroundColor: categoryColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-[2rem] border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5" />;
  }

  if (error && !recipe) {
    return (
      <div className="rounded-[2rem] border border-rose-300 bg-rose-50 p-8 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        {error}
      </div>
    );
  }

  if (!recipe) return null;

  const category = categoryMeta[recipe.category as keyof typeof categoryMeta];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)]"
    >
      <section
        className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-8 shadow-panel"
        style={
          {
            "--accent-color": category.color,
            "--accent-soft": `${category.color}44`
          } as CSSProperties
        }
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${category.color}, transparent 78%)` }}
        />
        <Link href="/catalog" className="inline-flex items-center gap-2 text-sm text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white group">
          <span className="transition-transform group-hover:-translate-x-1">←</span> Volver al catálogo
        </Link>
        <div className="mt-6">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${category.softClassName}`}>
            {category.label}
          </span>
          <h1 className="mt-4 font-display text-5xl leading-none sm:text-6xl">{recipe.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/65 dark:text-white/65">
            {recipe.description}
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {recipe.fields.map((field) => (
            <div key={field.id} className="relative">
              {renderField(field)}
            </div>
          ))}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-rose-300 bg-rose-50 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <div className="px-4 py-3">{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting}
            className={`group relative w-full sm:w-auto inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed`}
            style={{ backgroundColor: category.color }}
          >
            {/* Hover flash effect */}
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Shimmer overlay */}
            {!submitting && (
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}

            <div className="relative flex items-center justify-center gap-2">
              <AnimatePresence mode="popLayout">
                {submitting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Ejecutando...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Ejecutar automatización</span>
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        </form>
      </section>

      {/* ── Progress Panel ─── */}
      <aside className="glass-panel rounded-[2rem] p-8 shadow-panel" style={{ "--accent-color": category.color } as CSSProperties}>
        <p className="text-sm uppercase tracking-[0.24em] text-black/45 dark:text-white/45">
          Resultado
        </p>
        <div className="mt-5">
          {submitting ? (
            <div className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-black/10 bg-white/50 p-6 dark:border-white/10 dark:bg-white/5">
                {loadingMessages.map((msg, idx) => {
                  const isActive = idx === progressStep;
                  const isPast = idx < progressStep;
                  return (
                    <div key={msg} className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-500
                          ${isPast ? "bg-[color:var(--accent-color)]" : isActive ? "border-2 border-[color:var(--accent-color)]" : "border-2 border-black/10 dark:border-white/10"}
                        `}
                      >
                        {isPast && <CheckIcon />}
                        {isActive && (
                          <motion.div
                            layoutId="active-step-indicator"
                            className="h-2 w-2 rounded-full bg-[color:var(--accent-color)]"
                          />
                        )}
                      </div>
                      <span
                        className={`text-sm transition-colors duration-500 font-medium
                          ${isActive ? "text-[color:var(--accent-color)]" : isPast ? "text-black/70 dark:text-white/70" : "text-black/40 dark:text-white/40"}
                        `}
                      >
                        {msg}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <motion.div
                    key={`skeleton-panel-${index + 1}`}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                      delay: index * 0.2,
                    }}
                    className="h-24 rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-dashed border-black/15 bg-black/[0.02] p-5 dark:border-white/15 dark:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${category.softClassName}`}
                  >
                    <ResultPreviewIcon type={recipe.resultTemplate.type} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{resultPreview?.title}</p>
                    <p className="mt-2 text-sm leading-7 text-black/58 dark:text-white/58">
                      {resultPreview?.detail}
                    </p>
                  </div>
                </div>
              </div>

              {resultPreview?.chips.length ? (
                <div className="flex flex-wrap gap-2">
                  {resultPreview.chips.map((chip) => (
                    <span
                      key={chip}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${category.softClassName}`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}

              {renderResultPreview()}
            </div>
          )}
        </div>
      </aside>
    </motion.div>
  );
}
