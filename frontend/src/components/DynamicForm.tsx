"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

import { categoryMeta } from "@/lib/category";
import { getRecipe, runAutomation } from "@/lib/api";
import type { Field, Recipe } from "@/lib/types";

function fieldInputClassName() {
  return "mt-2 w-full rounded-2xl border border-[color:var(--accent-soft)] bg-white/80 px-4 py-3 text-sm text-black outline-none transition focus:border-[color:var(--accent-color)] dark:border-[color:var(--accent-soft)] dark:bg-white/5 dark:text-white";
}

type DynamicFormProps = {
  recipeId: string;
};

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

export function DynamicForm({ recipeId }: DynamicFormProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
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
      setProgressStep((current) => (current + 1) % loadingMessages.length);
    }, 1200);

    return () => {
      window.clearInterval(interval);
    };
  }, [submitting]);

  const missingFields = useMemo(() => {
    if (!recipe) {
      return [];
    }

    return recipe.fields
      .filter((field) => field.required && !values[field.id]?.trim())
      .map((field) => field.label);
  }, [recipe, values]);

  const resultPreview = useMemo(() => {
    if (!recipe) {
      return null;
    }

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
    if (!recipe || !resultPreview) {
      return null;
    }

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
                  <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${category.softClassName}`}>
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
                    background: `linear-gradient(135deg, ${category.color}28, rgba(255,255,255,0.86))`
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

    if (!recipe) {
      return;
    }

    if (missingFields.length > 0) {
      setError(`Completa los campos requeridos: ${missingFields.join(", ")}.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = recipe.fields.reduce<Record<string, string | number>>((accumulator, field) => {
        const value = values[field.id];
        if (!value) {
          return accumulator;
        }

        accumulator[field.id] = field.type === "number" ? Number(value) : value;
        return accumulator;
      }, {});

      const response = await runAutomation(recipe.id, payload);
      router.push(`/results/${response.executionId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "No se pudo ejecutar la automatización."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field: Field) {
    const inputClassName = fieldInputClassName();
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      placeholder: field.placeholder,
      value: values[field.id] || "",
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        updateValue(field.id, event.target.value),
      className: inputClassName
    };

    if (field.type === "textarea") {
      return <textarea {...commonProps} rows={5} />;
    }

    if (field.type === "select") {
      return (
        <select {...commonProps}>
          <option value="">Selecciona una opción</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        {...commonProps}
        type={field.type === "url" ? "url" : field.type}
        min={field.min}
        max={field.max}
      />
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

  if (!recipe) {
    return null;
  }

  const category = categoryMeta[recipe.category];
  const progressWidths = ["34%", "68%", "92%"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)]"
    >
      <section
        className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/82 p-8 shadow-panel dark:border-white/10 dark:bg-white/5"
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
        <Link href="/catalog" className="text-sm text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white">
          ← Volver al catálogo
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
            <label key={field.id} htmlFor={field.id} className="block">
              <span className="text-sm font-semibold">{field.label}</span>
              <div className="[&_input]:border-black/10 [&_select]:border-black/10 [&_textarea]:border-black/10">
                {renderField(field)}
              </div>
            </label>
          ))}

          {error ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${category.buttonClassName}`}
          >
            {submitting ? "Ejecutando automatización..." : "Ejecutar automatización →"}
          </button>
        </form>
      </section>

      <aside className="rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-panel dark:border-white/10 dark:bg-white/5">
        <p className="text-sm uppercase tracking-[0.24em] text-black/45 dark:text-white/45">
          Resultado
        </p>
        <div className="mt-5">
          {submitting ? (
            <div className="space-y-5">
              <div className={`rounded-2xl border px-4 py-3 text-sm ${category.softClassName}`}>
                {loadingMessages[progressStep]}
              </div>
              <div className="space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
                  <motion.div
                    key={progressStep}
                    initial={{ width: "18%" }}
                    animate={{ width: progressWidths[progressStep] }}
                    transition={{ duration: 0.65, ease: "easeInOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${category.color}, rgba(255,255,255,0.8))`
                    }}
                  />
                </div>
                <p className="text-sm text-black/55 dark:text-white/55">
                  {loadingMessages[progressStep]}
                </p>
              </div>
              <div className="grid gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`skeleton-panel-${index + 1}`}
                    className="h-24 animate-pulse rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
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
