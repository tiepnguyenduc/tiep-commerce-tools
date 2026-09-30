"use client";

import useSWR from "swr";
import type { B2BNavigationCategory } from "@/lib/b2b/types";

function isCategory(value: unknown): value is B2BNavigationCategory {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.slug === "string" &&
    Array.isArray(item.children) && item.children.every(isCategory);
}

export async function loadBusinessNavigation(url: string): Promise<B2BNavigationCategory[]> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("We couldn’t load the categories.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("categories" in data) || !Array.isArray(data.categories) || !data.categories.every(isCategory)) {
    throw new Error("We couldn’t load the categories.");
  }
  return data.categories;
}

export function useB2BNavigation() {
  const { data, error, isLoading, mutate } = useSWR<B2BNavigationCategory[]>("/api/b2b/navigation", loadBusinessNavigation, { shouldRetryOnError: false, revalidateOnFocus: false });
  return { categories: data ?? [], loading: isLoading, error: Boolean(error), retry: () => { void mutate(); } };
}
