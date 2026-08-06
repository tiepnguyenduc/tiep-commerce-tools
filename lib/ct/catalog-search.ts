function quotePredicateValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function buildProductCategoryWherePredicate(categoryIds: string[]) {
  const ids = categoryIds.map((id) => id.trim()).filter(Boolean);

  if (ids.length === 0) return undefined;

  return `masterData(current(categories(id in (${ids
    .map(quotePredicateValue)
    .join(",")}))))`;
}
