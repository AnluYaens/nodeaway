"use client";

import Link from "next/link";
import { useCallback, useRef, type MouseEvent } from "react";

import { motion } from "framer-motion";

import { categoryMeta } from "@/lib/category";
import type { Recipe, RecipeCategory } from "@/lib/types";

type AutomationCardProps = {
  recipe: Recipe;
};

export function AutomationCard({ recipe }: AutomationCardProps) {
  const category = categoryMeta[recipe.category as RecipeCategory];
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty("--spotlight-x", `${x}px`);
    card.style.setProperty("--spotlight-y", `${y}px`);
  }, []);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        ref={cardRef}
        href={`/run/${recipe.id}`}
        onMouseMove={handleMouseMove}
        className={`card-spotlight group relative isolate flex h-full min-h-[29rem] flex-col overflow-hidden rounded-[1.9rem] border border-black/10 bg-white/82 p-6 shadow-panel backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-black/18 hover:shadow-panel-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 ${category.glowClassName}`}
      >
        {/* ── Top accent bar — animates width on hover ─── */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-[1.9rem] transition-all duration-500 group-hover:h-2"
          style={{
            background: `linear-gradient(90deg, ${category.color}, transparent 78%)`
          }}
        />

        {/* ── Hover shimmer overlay ─── */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${category.color}08 50%, transparent 60%)`,
            backgroundSize: "200% 100%",
            animation: "spotlight 2.5s ease-in-out infinite"
          }}
        />

        <div className="relative z-[3] flex items-start justify-between gap-4">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 group-hover:shadow-sm ${category.softClassName}`}
          >
            {category.label}
          </span>
          {recipe.popular ? (
            <motion.span
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white shadow-sm dark:bg-white dark:text-black"
            >
              Popular
            </motion.span>
          ) : null}
        </div>

        <div className="relative z-[3] mt-5 flex min-h-[12.5rem] flex-col">
          <h3 className="text-[1.85rem] font-semibold tracking-tight [text-wrap:balance]">
            {recipe.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">
            {recipe.description}
          </p>
        </div>

        {/* ── Integration chips — subtle shift on hover ─── */}
        <div className="relative z-[3] mt-6 flex min-h-[3.25rem] flex-wrap content-start gap-2">
          {recipe.integrations.map((integration, index) => (
            <span
              key={integration}
              className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60 transition-all duration-300 group-hover:border-black/18 group-hover:bg-white/50 dark:border-white/10 dark:text-white/60 dark:group-hover:border-white/18 dark:group-hover:bg-white/5"
              style={{ transitionDelay: `${index * 30}ms` }}
            >
              {integration}
            </span>
          ))}
        </div>

        <div className="relative z-[3] mt-auto flex items-end justify-between gap-4 border-t border-black/8 pt-6 dark:border-white/8">
          <div className="text-sm font-medium text-black/55 dark:text-white/55">
            Tiempo estimado: {recipe.estimatedTime}
          </div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-black/40 transition-all duration-300 group-hover:gap-3 group-hover:text-black dark:text-white/40 dark:group-hover:text-white">
            <span>Abrir</span>
            <motion.span
              aria-hidden="true"
              className="text-sm"
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
            >
              →
            </motion.span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
