import "server-only";
import { randomUUID } from "node:crypto";
import type { Review } from "@commercetools/platform-sdk";
import { products } from "../sample-data";
import type {
  ProductRatingSummary,
  ProductReview,
  ProductReviewInput,
  ProductReviewPage,
} from "../types";
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

const RATINGS = [1, 2, 3, 4, 5];

function emptyDistribution() {
  return Object.fromEntries(RATINGS.map((rating) => [rating, 0]));
}

function summarize(reviews: ProductReview[]): ProductRatingSummary {
  const rated = reviews.filter((review) => typeof review.rating === "number");
  const distribution = emptyDistribution();
  let sum = 0;

  for (const { rating } of rated) {
    const value = Math.round(rating as number);
    if (value < 1 || value > 5) continue;
    distribution[value] += 1;
    sum += value;
  }

  return { average: rated.length ? sum / rated.length : 0, count: rated.length, distribution };
}

/**
 * Rating snapshot for the review summary and histogram. Live projects read
 * commercetools' own review statistics, which only count published reviews and
 * are recalculated asynchronously after a review is created.
 */
export async function readProductReviewSummary(productId: string): Promise<ProductRatingSummary> {
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    const { reviews } = trainingReviews(productId);
    return summarize(reviews);
  }

  const { body } = await apiRoot.productProjections().withId({ ID: productId }).get({
    queryArgs: { staged: false },
  }).execute();
  const statistics = body.reviewRatingStatistics;
  const distribution = emptyDistribution();

  for (const [rating, count] of Object.entries(statistics?.ratingsDistribution ?? {})) {
    const value = Math.round(Number(rating));
    if (value >= 1 && value <= 5) distribution[value] += Number(count) || 0;
  }

  return {
    average: statistics?.averageRating ?? 0,
    count: statistics?.count ?? 0,
    distribution,
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
