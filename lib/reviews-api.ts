"use client";

import type { ProductReview, ProductReviewInput, ProductReviewPage, ProductReviewQuery } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Reviews are temporarily unavailable. Please try again.");
  return data as T;
}

/** Only the parts of the query that differ from the defaults reach the URL. */
export function reviewQueryString({ offset = 0, search = "", ratings = [], withMedia, sort }: ProductReviewQuery) {
  const params = new URLSearchParams();

  if (offset) params.set("offset", String(offset));
  if (search.trim()) params.set("q", search.trim());
  if (ratings.length) params.set("rating", [...ratings].sort((a, b) => b - a).join(","));
  if (withMedia) params.set("media", "with");
  if (sort && sort !== "newest") params.set("sort", sort);

  return params.toString();
}

/** B2C reviews live under `/api/products`; the business storefront passes `/api/b2b/products`. */
export const DEFAULT_REVIEWS_BASE_PATH = "/api/products";

export async function loadProductReviews(
  productId: string,
  query: ProductReviewQuery = {},
  basePath = DEFAULT_REVIEWS_BASE_PATH,
) {
  const search = reviewQueryString(query);

  return readJson<ProductReviewPage>(await fetch(
    `${basePath}/${encodeURIComponent(productId)}/reviews${search ? `?${search}` : ""}`,
    { cache: "no-store" },
  ));
}

export type ReviewSubmission = Omit<ProductReviewInput, "media"> & { files?: File[] };

export async function submitProductReview(
  productId: string,
  { files = [], ...input }: ReviewSubmission,
  basePath = DEFAULT_REVIEWS_BASE_PATH,
) {
  const url = `${basePath}/${encodeURIComponent(productId)}/reviews`;

  // Media has to travel as multipart; a plain draft stays JSON.
  if (!files.length) {
    return readJson<{ review: ProductReview }>(await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  }

  const form = new FormData();
  for (const [name, value] of Object.entries(input)) form.set(name, String(value));
  for (const file of files) form.append("media", file);

  return readJson<{ review: ProductReview }>(await fetch(url, { method: "POST", body: form }));
}
