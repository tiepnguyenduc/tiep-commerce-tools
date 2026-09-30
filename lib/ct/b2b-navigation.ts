import "server-only";
import type { Category } from "@commercetools/platform-sdk";
import type { B2BNavigationCategory } from "../b2b/types";
import { getB2BApiRoot } from "./client";

export class B2BNavigationUnavailable extends Error {}

export function buildB2BNavigation(categories: Category[], locale: string): B2BNavigationCategory[] {
  const localized = (values: Record<string, string>) =>
    values[locale] || values[locale.split("-")[0]] || values["en-US"] || values.en || Object.values(values)[0] || "";
  const resources = new Map(categories.map((category) => [category.id, category]));
  const nodes = new Map(categories.map((category) => [category.id, {
    id: category.id,
    name: localized(category.name),
    slug: localized(category.slug),
    children: [] as B2BNavigationCategory[],
  }]));
  const roots: B2BNavigationCategory[] = [];
  for (const category of resources.values()) {
    const node = nodes.get(category.id)!;
    const parentId = category.parent?.id;
    const seen = new Set([category.id]);
    let ancestor = parentId;
    while (ancestor && !seen.has(ancestor)) {
      seen.add(ancestor);
      ancestor = resources.get(ancestor)?.parent?.id;
    }
    // Keep malformed/orphaned categories reachable without producing a cycle.
    if (parentId && nodes.has(parentId) && !ancestor) nodes.get(parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (siblings: B2BNavigationCategory[]) => {
    siblings.sort((a, b) =>
      Number(resources.get(a.id)?.orderHint || 0) - Number(resources.get(b.id)?.orderHint || 0)
      || a.name.localeCompare(b.name, locale) || a.id.localeCompare(b.id));
    siblings.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

export async function loadB2BNavigation(locale = process.env.CTP_B2B_LOCALE || "en-US") {
  const api = getB2BApiRoot();
  if (!api) throw new B2BNavigationUnavailable("Business navigation is not configured.");
  const categories: Category[] = [];
  let cursor: string | undefined;
  for (;;) {
    const { body } = await api.categories().get({ queryArgs: {
      limit: 500,
      withTotal: false,
      sort: "id asc",
      ...(cursor ? { where: `id > ${JSON.stringify(cursor)}` } : {}),
    } }).execute();
    categories.push(...body.results);
    if (body.results.length < 500) break;
    const nextCursor = body.results[body.results.length - 1].id;
    if (nextCursor === cursor) throw new Error("Category pagination did not advance.");
    cursor = nextCursor;
  }
  return buildB2BNavigation(categories, locale);
}
