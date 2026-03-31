import type { Execution, Recipe } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getRecipes(): Promise<Recipe[]> {
  return request<Recipe[]>("/api/recipes");
}

export function getRecipe(id: string): Promise<Recipe> {
  return request<Recipe>(`/api/recipes/${id}`);
}

export function runAutomation(id: string, data: Record<string, unknown>): Promise<Execution> {
  return request<Execution>(`/api/run/${id}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function getHistory(): Promise<Execution[]> {
  return request<Execution[]>("/api/history");
}

export function getExecution(executionId: string): Promise<Execution> {
  return request<Execution>(`/api/history/${executionId}`);
}

export function submitSuggestion(data: {
  descripcion: string;
  categoria?: string;
  contacto?: string;
}): Promise<{ id: string; message: string }> {
  return request<{ id: string; message: string }>("/api/suggestions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
