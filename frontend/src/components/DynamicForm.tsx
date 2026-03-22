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

export function DynamicForm({ recipeId }: DynamicFormProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const loadingMessages = [
    "Preparando automatizacion...",
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
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la automatizacion.");
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
        submitError instanceof Error ? submitError.message : "No se pudo ejecutar la automatizacion."
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
          <option value="">Selecciona una opcion</option>
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
          ← Volver al catalogo
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
            {submitting ? "Ejecutando automatizacion..." : "Ejecutar automatizacion →"}
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
            <div className="rounded-2xl border border-dashed border-black/15 px-5 py-10 text-sm leading-7 text-black/55 dark:border-white/15 dark:text-white/55">
              Ejecuta la receta y te llevare directamente a una pantalla de resultados dedicada con historial persistido.
            </div>
          )}
        </div>
      </aside>
    </motion.div>
  );
}
