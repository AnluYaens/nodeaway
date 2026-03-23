"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

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
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo.");
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
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-black/50 dark:text-white/50">
            Catálogo visual
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[0.94] sm:text-6xl lg:text-7xl">
            Automatizaciones listas para usar, sin nodos ni fricción.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-black/62 dark:text-white/62">
            Nodeaway convierte flujos complejos en experiencias simples: eliges una receta,
            completas unos pocos campos y recibes el resultado listo.
          </p>
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
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06
              }
            }
          }}
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredRecipes.map((recipe) => (
            <motion.div
              key={recipe.id}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.28 }}
              className="h-full"
            >
              <AutomationCard recipe={recipe} />
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </motion.section>
  );
}
