"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { getRecipe, runAutomation } from "@/lib/api";
import type { Execution, Field, Recipe } from "@/lib/types";

function fieldInputClassName() {
  return "mt-2 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black outline-none transition focus:border-black/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30";
}

function renderExecutionResult(execution: Execution) {
  const { result } = execution;

  if (result.type === "dashboard") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {result.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {result.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
                Prioridad {item.priority}
              </p>
              <p className="mt-2 text-sm text-black/65 dark:text-white/65">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.type === "report") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
            Score
          </p>
          <p className="mt-2 text-4xl font-semibold">{result.score}</p>
          <p className="mt-3 text-sm text-black/65 dark:text-white/65">{result.headline}</p>
        </div>
        {result.sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-lg font-semibold">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/65 dark:text-white/65">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "social-posts") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {result.posts.map((post, index) => (
          <div
            key={`${post.text}-${index + 1}`}
            className="rounded-2xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
              Post {index + 1}
            </p>
            <p className="mt-3 text-sm leading-6 text-black/75 dark:text-white/75">{post.text}</p>
            <p className="mt-4 text-xs text-black/50 dark:text-white/50">
              {post.hashtags.join(" ")}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-5 text-sm leading-7 text-black/75 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
      {result.content}
    </div>
  );
}

type DynamicFormProps = {
  recipeId: string;
};

export function DynamicForm({ recipeId }: DynamicFormProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);

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
      setExecution(response);
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

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.8fr)]">
      <section className="rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-panel dark:border-white/10 dark:bg-white/5">
        <Link href="/catalog" className="text-sm text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white">
          ← Volver al catalogo
        </Link>
        <div className="mt-6">
          <p className="text-sm uppercase tracking-[0.24em] text-black/45 dark:text-white/45">
            {recipe.category}
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none">{recipe.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/65 dark:text-white/65">
            {recipe.description}
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {recipe.fields.map((field) => (
            <label key={field.id} htmlFor={field.id} className="block">
              <span className="text-sm font-semibold">{field.label}</span>
              {renderField(field)}
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
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
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
          {execution ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                Automatizacion completada. Execution ID: {execution.executionId}
              </div>
              {renderExecutionResult(execution)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 px-5 py-10 text-sm leading-7 text-black/55 dark:border-white/15 dark:text-white/55">
              Cuando ejecutes esta receta, aqui aparecera el resultado mock del backend.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
