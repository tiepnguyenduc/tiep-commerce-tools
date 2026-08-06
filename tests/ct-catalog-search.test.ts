import { describe, expect, it } from "vitest";
import { buildProductCategoryWherePredicate } from "../lib/ct/catalog-search";

describe("commercetools product query request", () => {
  it("filters PLP results by Merchant Center category id and descendants", () => {
    expect(
      buildProductCategoryWherePredicate([
        "root-furniture",
        "chairs",
        "tables",
      ]),
    ).toBe(
      'masterData(current(categories(id in ("root-furniture","chairs","tables"))))',
    );
  });
});
