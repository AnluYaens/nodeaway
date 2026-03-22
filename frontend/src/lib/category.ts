import type { RecipeCategory } from "@/lib/types";

export const categoryMeta: Record<
  RecipeCategory,
  {
    label: string;
    color: string;
    softClassName: string;
    borderClassName: string;
    buttonClassName: string;
    glowClassName: string;
  }
> = {
  dev: {
    label: "Developers",
    color: "#7F77DD",
    softClassName: "bg-dev/12 text-dev border-dev/20",
    borderClassName: "border-dev/25 focus:border-dev/60",
    buttonClassName: "bg-dev text-white hover:bg-[#6e65d4]",
    glowClassName: "shadow-[0_20px_40px_rgba(127,119,221,0.22)]"
  },
  life: {
    label: "Personal",
    color: "#1D9E75",
    softClassName: "bg-life/12 text-life border-life/20",
    borderClassName: "border-life/25 focus:border-life/60",
    buttonClassName: "bg-life text-white hover:bg-[#168460]",
    glowClassName: "shadow-[0_20px_40px_rgba(29,158,117,0.2)]"
  },
  biz: {
    label: "Negocios",
    color: "#D85A30",
    softClassName: "bg-biz/12 text-biz border-biz/20",
    borderClassName: "border-biz/25 focus:border-biz/60",
    buttonClassName: "bg-biz text-white hover:bg-[#bf4d28]",
    glowClassName: "shadow-[0_20px_40px_rgba(216,90,48,0.22)]"
  }
};

export const recipeCategoryById: Record<string, RecipeCategory> = {
  "github-issue-summarizer": "dev",
  "repo-health-report": "dev",
  "news-digest-ai": "life",
  "price-watcher": "life",
  "social-post-generator": "biz",
  "review-responder": "biz"
};
