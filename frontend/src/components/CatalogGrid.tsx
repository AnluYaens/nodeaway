"use client";

import { useEffect, useMemo, useState } from "react";

import { getRecipes } from "@/lib/api";
import type { Recipe } from "@/lib/types";

import { AutomationCard } from "./AutomationCard";
import { CategoryFilter, type CategoryValue } from "./CategoryFilter";

export function CatalogGrid() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryValue>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecipes();
        if (!cancelled) {
          setRecipes(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catalogo.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecipes = useMemo(() => {
    if (activeCategory === "all") {
      return recipes;
    }

    return recipes.filter((recipe) => recipe.category === activeCategory);
  }, [activeCategory, recipes]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
            Catalogo visual
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
            Elige la automatizacion y ejecutala sin workflow.
          </h1>
        </div>
        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index + 1}`}
              className="h-72 animate-pulse rounded-[1.75rem] border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-300 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <AutomationCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
