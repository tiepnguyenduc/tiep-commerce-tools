"use client";

import type { ProductReview, ProductReviewInput, ProductReviewPage } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Reviews are temporarily unavailable. Please try again.");
  return data as T;
}

export async function loadProductReviews(productId: string, offset = 0) {
  return readJson<ProductReviewPage>(await fetch(
    `/api/products/${encodeURIComponent(productId)}/reviews?offset=${offset}`,
    { cache: "no-store" },
  ));
}

export async function submitProductReview(productId: string, input: ProductReviewInput) {
  return readJson<{ review: ProductReview }>(await fetch(
    `/api/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  ));
}
