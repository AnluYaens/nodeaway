export type RecipeCategory = "dev" | "life" | "biz";
export type FieldType = "text" | "email" | "number" | "textarea" | "select" | "url" | "password";
export type ResultType = "dashboard" | "social-posts" | "report" | "text";

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  default?: string | number;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  category: RecipeCategory;
  icon: string;
  estimatedTime: string;
  integrations: string[];
  popular: boolean;
  fields: Field[];
  resultTemplate: {
    type: ResultType;
    features: string[];
  };
};

export type DashboardResult = {
  type: "dashboard";
  summary: string;
  stats: Array<{ label: string; value: string; trend?: string }>;
  items: Array<{ title: string; priority: string; reason: string }>;
  context?: Record<string, unknown>;
  mode?: string;
};

export type ReportResult = {
  type: "report";
  headline: string;
  score: number;
  sections: Array<{ title: string; content: string; score?: number }>;
  recommendations?: string[];
  context?: Record<string, unknown>;
  mode?: string;
};

export type SocialPostResult = {
  type: "social-posts";
  posts: Array<{
    platform: string;
    brandName: string;
    text: string;
    hashtags: string[];
    imagePrompt: string;
    imageBase64?: string | null;
  }>;
  mode?: string;
};

export type TextResult = {
  type: "text";
  content: string;
  context?: Record<string, unknown>;
  mode?: string;
};

export type Result = DashboardResult | ReportResult | SocialPostResult | TextResult;

export type Execution = {
  executionId: string;
  recipeId: string;
  recipeTitle: string;
  status: "success" | "error" | "running";
  input: Record<string, unknown>;
  result: Result;
  createdAt: string;
  mode?: "live" | "mock" | "fallback";
};
