"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import { getRecipes } from "@/lib/api";
import type { Recipe } from "@/lib/types";

import { AutomationCard } from "./AutomationCard";
import { CategoryFilter, type CategoryValue } from "./CategoryFilter";

/* ── Hero animated orbs ─────────────────────────── */

function HeroOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Dev purple orb */}
      <div
        className="absolute -left-20 -top-20 h-72 w-72 animate-hero-orb rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(127,119,221,0.35), transparent 70%)",
          animationDelay: "0s"
        }}
      />
      {/* Life teal orb */}
      <div
        className="absolute -right-12 top-8 h-56 w-56 animate-hero-orb-slow rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(29,158,117,0.30), transparent 70%)",
          animationDelay: "-3s"
        }}
      />
      {/* Biz coral orb */}
      <div
        className="absolute -bottom-10 left-1/3 h-48 w-48 animate-hero-orb rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(216,90,48,0.25), transparent 70%)",
          animationDelay: "-5s"
        }}
      />
      {/* Subtle dot mesh */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
    </div>
  );
}

/* ── Category glow pills for hero ─────────────────── */

function HeroCategoryPills() {
  const pills = [
    { label: "Dev", color: "#7F77DD" },
    { label: "Personal", color: "#1D9E75" },
    { label: "Negocios", color: "#D85A30" }
  ];

  return (
    <motion.div
      className="mt-6 flex flex-wrap gap-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {pills.map((pill) => (
        <motion.span
          key={pill.label}
          variants={{
            hidden: { opacity: 0, scale: 0.85 },
            show: { opacity: 1, scale: 1 }
          }}
          transition={{ duration: 0.35 }}
          className="relative inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-medium dark:border-white/10 dark:bg-white/5"
        >
          <span
            className="inline-block h-2 w-2 animate-pulse-glow rounded-full"
            style={{ backgroundColor: pill.color }}
          />
          {pill.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

/* ── Main Catalog Grid ─────────────────────────── */

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
      className="space-y-10"
    >
      {/* ── Premium Hero Section ─── */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-black/8 bg-white/60 px-8 py-14 shadow-panel backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03] sm:px-12 sm:py-20 lg:px-16">
        <HeroOrbs />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-sm uppercase tracking-[0.28em] text-black/50 dark:text-white/50"
            >
              Catálogo visual
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-4 font-display text-5xl leading-[0.94] sm:text-6xl lg:text-7xl"
            >
              Automatizaciones listas para usar,{" "}
              <span className="gradient-text">sin nodos ni fricción.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="mt-5 max-w-2xl text-sm leading-7 text-black/62 dark:text-white/62"
            >
              Nodeaway convierte flujos complejos en experiencias simples: eliges una receta,
              completas unos pocos campos y recibes el resultado listo.
            </motion.p>

            <HeroCategoryPills />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
          </motion.div>
        </div>
      </div>

      {/* ── Skeleton loading ─── */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index + 1}`}
              className="relative h-72 overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
            >
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Error ─── */}
      {error ? (
        <div className="rounded-[1.75rem] border border-rose-300 bg-rose-50 p-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* ── Cards grid ─── */}
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
