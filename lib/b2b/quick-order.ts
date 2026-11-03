import type { B2BProduct } from "./types";
export type QuickOrderRow = { id: string; sku: string; quantity: string };
export function resolveQuickOrderRow(
  row: QuickOrderRow,
  products: B2BProduct[],
) {
  const sku = row.sku.trim().toLowerCase();
  const quantity = Number(row.quantity);
  if (!sku) return { error: "Enter a SKU." } as const;
  if (
    !/^\d+$/.test(row.quantity) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 10000
  )
    return {
      error: "Quantity must be a whole number from 1 to 10,000.",
    } as const;
  const matches = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.sku.trim().toLowerCase() === sku)
      .map((variant) => ({ product, variant })),
  );
  if (!matches.length)
    return { error: "SKU not found in this store’s assortment." } as const;
  if (matches.length !== 1)
    return {
      error:
        "This SKU matches more than one option. Open the product to choose.",
    } as const;
  return { ...matches[0], quantity, error: null } as const;
}
export function duplicateQuickOrderRows(rows: QuickOrderRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const sku = row.sku.trim().toLowerCase();
    if (sku) counts.set(sku, (counts.get(sku) || 0) + 1);
  }
  return new Set(
    rows
      .filter((row) => (counts.get(row.sku.trim().toLowerCase()) || 0) > 1)
      .map((row) => row.id),
  );
}

/** Stop at any unconfirmed request; a network error may follow a successful mutation. */
export async function runQuickOrderBatch<T>(
  items: T[],
  canContinue: () => boolean,
  add: (item: T) => Promise<boolean>,
  record: (item: T, success: boolean) => void,
) {
  let completed = 0;
  for (const item of items) {
    if (!canContinue()) return { completed, uncertain: false, stopped: true };
    let success = false;
    try {
      success = await add(item);
    } catch {
      /* The mutation outcome is unknown. */
    }
    if (!canContinue())
      return { completed, uncertain: !success, stopped: true };
    record(item, success);
    if (!success) return { completed, uncertain: true, stopped: true };
    completed += 1;
  }
  return { completed, uncertain: false, stopped: false };
}
