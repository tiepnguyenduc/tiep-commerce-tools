import type { Category } from "@/lib/launchpad/types/entity/category";
import type { HeaderCategory } from "@/lib/types";

/** Catalog listing URL of a category, kept in sync with the products page params. */
export function categoryUrl(category: Pick<HeaderCategory, "id" | "name">) {
  return `/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`;
}

/**
 * The commercetools-ui navigation works on the Launchpad category tree while the BFF
 * returns a flat list. A category whose parent is missing from the response - or whose
 * parent chain loops - stays at the root instead of disappearing from the menu.
 */
export function toLaunchpadCategoryTree(categories: HeaderCategory[]): Category[] {
  const parents = new Map(categories.map((category) => [category.id, category.parentId]));
  const nodes = new Map<string, Category>(
    categories.map((category) => [
      category.id,
      {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        _url: categoryUrl(category),
        _urls: {},
        depth: 1,
        descendants: [],
      },
    ]),
  );

  const parentIdOf = (id: string) => {
    const parentId = parents.get(id);
    return parentId && parentId !== id && nodes.has(parentId) ? parentId : undefined;
  };

  const attachableParentId = (id: string) => {
    const seen = new Set([id]);
    for (let parentId = parentIdOf(id); parentId; parentId = parentIdOf(parentId)) {
      if (seen.has(parentId)) return undefined;
      seen.add(parentId);
    }
    return parentIdOf(id);
  };

  const roots: Category[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id) as Category;
    const parentId = attachableParentId(category.id);

    if (parentId) {
      node.parentId = parentId;
      nodes.get(parentId)?.descendants?.push(node);
    } else {
      roots.push(node);
    }
  }

  const setDepth = (branch: Category[], depth: number) => {
    for (const node of branch) {
      node.depth = depth;
      setDepth(node.descendants ?? [], depth + 1);
    }
  };
  setDepth(roots, 1);

  return roots;
}
