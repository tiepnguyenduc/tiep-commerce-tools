"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

export type RecentlyViewedProduct = Pick<
  Product,
  "id" | "slug" | "sku" | "name" | "category" | "image" | "price"
>;

const storageKey = "launchpad-recently-viewed-products";
const maxStoredProducts = 8;

function isRecentlyViewedProduct(value: unknown): value is RecentlyViewedProduct {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecentlyViewedProduct>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.sku === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.image === "string" &&
    typeof candidate.price?.formatted === "string" &&
    typeof candidate.price?.centAmount === "number" &&
    typeof candidate.price?.currencyCode === "string"
  );
}

function readRecentlyViewedProducts() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isRecentlyViewedProduct).slice(0, maxStoredProducts)
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
    const viewed: RecentlyViewedProduct = {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      category: product.category,
      image: product.image,
      price: product.price,
    };
    const current = readRecentlyViewedProducts();
    const next = [
      viewed,
      ...current.filter((item) => item.id !== viewed.id),
    ].slice(0, maxStoredProducts);

    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(storageKey));
  }, [
    product.category,
    product.id,
    product.image,
    product.name,
    product.price,
    product.sku,
    product.slug,
  ]);

  return null;
}
