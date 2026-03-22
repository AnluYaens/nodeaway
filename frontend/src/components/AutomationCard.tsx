import Link from "next/link";

import type { Recipe, RecipeCategory } from "@/lib/types";

const categoryTheme: Record<RecipeCategory, string> = {
  dev: "border-dev/20 bg-dev/10 text-dev",
  life: "border-life/20 bg-life/10 text-life",
  biz: "border-biz/20 bg-biz/10 text-biz"
};

const categoryLabel: Record<RecipeCategory, string> = {
  dev: "Developers",
  life: "Personal",
  biz: "Negocios"
};

type AutomationCardProps = {
  recipe: Recipe;
};

export function AutomationCard({ recipe }: AutomationCardProps) {
  return (
    <Link
      href={`/run/${recipe.id}`}
      className="group flex h-full flex-col rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${categoryTheme[recipe.category]}`}
        >
          {categoryLabel[recipe.category]}
        </span>
        {recipe.popular ? (
          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
            Popular
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <h3 className="text-2xl font-semibold tracking-tight">{recipe.title}</h3>
        <p className="mt-3 text-sm leading-6 text-black/65 dark:text-white/65">
          {recipe.description}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {recipe.integrations.map((integration) => (
          <span
            key={integration}
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60 dark:border-white/10 dark:text-white/60"
          >
            {integration}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-8 text-sm font-medium text-black/55 dark:text-white/55">
        Tiempo estimado: {recipe.estimatedTime}
      </div>
    </Link>
  );
}
