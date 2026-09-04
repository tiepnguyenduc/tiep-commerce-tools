import "server-only";
import { randomUUID } from "node:crypto";
import type { Review } from "@commercetools/platform-sdk";
import { products } from "../sample-data";
import type { ProductReview, ProductReviewInput, ProductReviewPage } from "../types";
import { getApiRoot } from "./client";

const PAGE_SIZE = 5;

declare global {
  var __trainingProductReviews: Map<string, ProductReview[]> | undefined;
}

export class ProductReviewError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function reviewErrorResponse(error: unknown) {
  if (error instanceof ProductReviewError) {
    return { error: error.message, status: error.status };
  }
  const status = (error as { statusCode?: number } | null)?.statusCode;
  if (status === 404) return { error: "Product not found.", status: 404 };
  return {
    error: "Reviews are temporarily unavailable. Please try again.",
    status: 503,
  };
}

function mapReview(review: Review): ProductReview {
  return {
    id: review.id,
    authorName: review.authorName || "Anonymous",
    title: review.title || "",
    text: review.text || "",
    rating: review.rating,
    createdAt: review.createdAt,
  };
}

function trainingReviews(productId: string) {
  if (!products.some((product) => product.id === productId)) {
    throw new ProductReviewError("Product not found.", 404);
  }
  const store = (globalThis.__trainingProductReviews ??= new Map());
  return { store, reviews: store.get(productId) ?? [] };
}

export async function readProductReviews(
  productId: string,
  offset = 0,
): Promise<ProductReviewPage> {
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    const { reviews } = trainingReviews(productId);
    return {
      reviews: reviews.slice(offset, offset + PAGE_SIZE),
      total: reviews.length,
      offset,
      limit: PAGE_SIZE,
    };
  }

  const { body } = await apiRoot.reviews().get({
    queryArgs: {
      where: `target(typeId="product" and id=${JSON.stringify(productId)}) and includedInStatistics=true`,
      sort: ["createdAt desc", "id desc"],
      limit: PAGE_SIZE,
      offset,
      withTotal: true,
    },
  }).execute();
  return {
    reviews: body.results.map(mapReview),
    total: body.total ?? body.count,
    offset,
    limit: PAGE_SIZE,
  };
}

export async function createProductReview(
  productId: string,
  input: ProductReviewInput,
): Promise<ProductReview> {
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    const { store, reviews } = trainingReviews(productId);
    const review = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store.set(productId, [review, ...reviews]);
    return review;
  }

  // Only published products can receive reviews through the storefront.
  await apiRoot.productProjections().withId({ ID: productId }).get({
    queryArgs: { staged: false },
  }).execute();
  const { body } = await apiRoot.reviews().post({
    body: {
      ...input,
      locale: process.env.CTP_LOCALE || "en-US",
      target: { typeId: "product", id: productId },
    },
  }).execute();
  return mapReview(body);
}
