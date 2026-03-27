import Link from "next/link";

import { motion } from "framer-motion";

import { categoryMeta } from "@/lib/category";
import type { Recipe, RecipeCategory } from "@/lib/types";

type AutomationCardProps = {
  recipe: Recipe;
};

export function AutomationCard({ recipe }: AutomationCardProps) {
  const category = categoryMeta[recipe.category as RecipeCategory];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        href={`/run/${recipe.id}`}
        className={`group relative isolate flex h-full min-h-[29rem] flex-col overflow-hidden rounded-[1.9rem] border border-black/10 bg-white/82 p-6 shadow-panel backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/18 hover:shadow-panel-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 ${category.glowClassName}`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-[1.9rem]"
          style={{
            background: `linear-gradient(90deg, ${category.color}, transparent 78%)`
          }}
        />
        <div className="flex items-start justify-between gap-4">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${category.softClassName}`}
          >
            {category.label}
          </span>
          {recipe.popular ? (
            <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
              Popular
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex min-h-[12.5rem] flex-col">
          <h3 className="text-[1.85rem] font-semibold tracking-tight [text-wrap:balance]">
            {recipe.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">
            {recipe.description}
          </p>
        </div>

        <div className="mt-6 flex min-h-[3.25rem] flex-wrap content-start gap-2">
          {recipe.integrations.map((integration) => (
            <span
              key={integration}
              className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60 dark:border-white/10 dark:text-white/60"
            >
              {integration}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-black/8 pt-6 dark:border-white/8">
          <div className="text-sm font-medium text-black/55 dark:text-white/55">
            Tiempo estimado: {recipe.estimatedTime}
          </div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-black/40 transition group-hover:gap-3 group-hover:text-black dark:text-white/40 dark:group-hover:text-white">
            <span>Abrir</span>
            <span aria-hidden="true" className="text-sm transition group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
