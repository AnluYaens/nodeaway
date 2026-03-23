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
    color: "#2563EB",
    softClassName: "bg-dev/12 text-dev border-dev/20",
    borderClassName: "border-dev/25 focus:border-dev/60",
    buttonClassName: "bg-dev text-white hover:bg-[#1d4ed8]",
    glowClassName: "shadow-[0_20px_40px_rgba(37,99,235,0.22)]"
  },
  life: {
    label: "Personal",
    color: "#0F9F76",
    softClassName: "bg-life/12 text-life border-life/20",
    borderClassName: "border-life/25 focus:border-life/60",
    buttonClassName: "bg-life text-white hover:bg-[#0b7f5e]",
    glowClassName: "shadow-[0_20px_40px_rgba(15,159,118,0.2)]"
  },
  biz: {
    label: "Negocios",
    color: "#D97706",
    softClassName: "bg-biz/12 text-biz border-biz/20",
    borderClassName: "border-biz/25 focus:border-biz/60",
    buttonClassName: "bg-biz text-white hover:bg-[#b45309]",
    glowClassName: "shadow-[0_20px_40px_rgba(217,119,6,0.22)]"
  }
};

export const recipeCategoryById: Record<string, RecipeCategory> = {
  "github-health-auditor": "dev",
  "github-issue-summarizer": "dev",
  "landing-page-analyzer": "biz",
  "reddit-opinion-radar": "biz",
  "rss-news-digest": "life",
  "social-post-generator": "biz"
};
