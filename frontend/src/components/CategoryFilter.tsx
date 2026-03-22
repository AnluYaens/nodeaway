"use client";

import type { RecipeCategory } from "@/lib/types";

export type CategoryValue = "all" | RecipeCategory;

const filters: Array<{ value: CategoryValue; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "dev", label: "Dev" },
  { value: "life", label: "Personal" },
  { value: "biz", label: "Negocios" }
];

type CategoryFilterProps = {
  active: CategoryValue;
  onChange: (value: CategoryValue) => void;
};

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => {
        const isActive = filter.value === active;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/10 bg-white/75 text-black/70 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
