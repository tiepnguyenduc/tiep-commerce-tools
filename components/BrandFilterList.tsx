"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import { useState } from "react";

const visibleBrandCount = 6;

export function BrandFilterList({
  brands,
  selectedBrands = [],
}: {
  brands: string[];
  selectedBrands?: string[];
}) {
  const selectedBrandSet = new Set(selectedBrands);
  const selectedIndex = brands.findIndex((brand) => selectedBrandSet.has(brand));
  const [expanded, setExpanded] = useState(selectedIndex >= visibleBrandCount);
  const visibleBrands = expanded ? brands : brands.slice(0, visibleBrandCount);
  const canToggle = brands.length > visibleBrandCount;

  return (
    <fieldset className="filter-group brand-filter-group">
      <legend className="filter-label">Brand</legend>
      <div className="brand-filter-list">
        {visibleBrands.map((brand) => (
          <label className="check-row" key={brand}>
            <input
              defaultChecked={selectedBrandSet.has(brand)}
              name="brand"
              type="checkbox"
              value={brand}
            />
            <span>{brand}</span>
          </label>
        ))}
      </div>
      {canToggle ? (
        <UIButton variant="ghost" size="fit"
          className="filter-toggle-button"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : `Show more (${brands.length - visibleBrandCount})`}
        </UIButton>
      ) : null}
    </fieldset>
  );
}
