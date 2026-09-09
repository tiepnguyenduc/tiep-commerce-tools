"use client";
import { useEffect, useState } from "react";
import { isProductItemData, productToProductItem, type ProductItemData } from "@/components/ProductItemData";
import type { Product } from "@/lib/types";

export type RecentlyViewedProduct = ProductItemData;

const storageKey = "launchpad-recently-viewed-products";
const maxStoredProducts = 8;

function readRecentlyViewedProducts() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isProductItemData).slice(0, maxStoredProducts)
      : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewedProducts() {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    const refresh = () => setProducts(readRecentlyViewedProducts());

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(storageKey, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(storageKey, refresh);
    };
  }, []);

  return products;
}

export function TrackRecentlyViewedProduct({ product }: { product: Product }) {
  useEffect(() => {
    const viewed = productToProductItem(product);
    const current = readRecentlyViewedProducts();
    const next = [
      viewed,
      ...current.filter((item) => item.id !== viewed.id),
    ].slice(0, maxStoredProducts);

    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(storageKey));
  }, [
    product.category,
    product.brand,
    product.description,
    product.id,
    product.image,
    product.name,
    product.price,
    product.sku,
    product.slug,
  ]);

  return null;
}
