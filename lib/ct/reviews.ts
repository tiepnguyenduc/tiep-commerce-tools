import "server-only";
import { randomUUID } from "node:crypto";
import type { Review } from "@commercetools/platform-sdk";
import { products } from "../sample-data";
import type {
  ProductRatingSummary,
  ProductReview,
  ProductReviewFacets,
  ProductReviewInput,
  ProductReviewPage,
  ProductReviewQuery,
  ReviewSortOrder,
} from "../types";
import { getApiRoot, getB2BApiRoot } from "./client";
import { sanitizeStoredMedia } from "./review-media";

const PAGE_SIZE = 5;
/**
 * commercetools cannot filter reviews by free text or by custom fields, and its rating
 * statistics are recalculated asynchronously. The storefront therefore reads the
 * product's reviews once and derives the list, the facets and the average from them.
 * The ceiling keeps that predictable for the catalogue sizes this storefront targets.
 */
const SCAN_LIMIT = 500;

/** Custom type carrying the media a shopper attached to a review. */
export const REVIEW_MEDIA_TYPE_KEY = "storefront-review-media";
const MEDIA_FIELD = "media";

/** B2C and B2B storefronts read and write reviews in their own commercetools project. */
export type ReviewCatalog = "b2c" | "b2b";

function apiRootFor(catalog: ReviewCatalog) {
  return catalog === "b2b" ? getB2BApiRoot() : getApiRoot();
}

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

function storedMedia(review: Review) {
  const raw = review.custom?.fields?.[MEDIA_FIELD];
  if (typeof raw !== "string") return sanitizeStoredMedia(raw);
  try {
    return sanitizeStoredMedia(JSON.parse(raw));
  } catch {
    return [];
  }
}

function mapReview(review: Review): ProductReview {
  return {
    id: review.id,
    authorName: review.authorName || "Anonymous",
    title: review.title || "",
    text: review.text || "",
    rating: review.rating,
    createdAt: review.createdAt,
    media: storedMedia(review),
  };
}

function trainingReviews(productId: string) {
  if (!products.some((product) => product.id === productId)) {
    throw new ProductReviewError("Product not found.", 404);
  }
  const store = (globalThis.__trainingProductReviews ??= new Map());
  return { store, reviews: store.get(productId) ?? [] };
}

/** Every review of a product, newest first, capped at {@link SCAN_LIMIT}. */
async function scanProductReviews(productId: string, catalog: ReviewCatalog): Promise<ProductReview[]> {
  const apiRoot = apiRootFor(catalog);
  if (!apiRoot) return trainingReviews(productId).reviews;

  const { body } = await apiRoot.reviews().get({
    queryArgs: {
      where: `target(typeId="product" and id=${JSON.stringify(productId)}) and includedInStatistics=true`,
      sort: ["createdAt desc", "id desc"],
      limit: SCAN_LIMIT,
      withTotal: false,
      expand: ["custom.type"],
    },
  }).execute();

  return body.results.map(mapReview);
}

const RATINGS = [1, 2, 3, 4, 5];

function emptyDistribution() {
  return Object.fromEntries(RATINGS.map((rating) => [rating, 0]));
}

function wholeStars(review: ProductReview) {
  if (typeof review.rating !== "number") return null;
  const value = Math.round(review.rating);
  return value >= 1 && value <= 5 ? value : null;
}

function matchesQuery(review: ProductReview, { search, ratings, withMedia }: ProductReviewQuery) {
  if (withMedia && !review.media.length) return false;
  if (ratings?.length) {
    const stars = wholeStars(review);
    if (stars === null || !ratings.includes(stars)) return false;
  }
  if (search) {
    const haystack = `${review.title} ${review.text} ${review.authorName}`.toLowerCase();
    if (!search.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term))) return false;
  }
  return true;
}

const BY_RATING: Partial<Record<ReviewSortOrder, (a: ProductReview, b: ProductReview) => number>> = {
  highest: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  lowest: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
};

/**
 * Orders newest first, then applies the requested order on top. Sorting is stable, so
 * reviews written within the same second keep a predictable order instead of shuffling
 * between requests.
 */
function sortReviews(reviews: ProductReview[], sort: ReviewSortOrder) {
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (sort === "oldest") reviews.reverse();
  else if (BY_RATING[sort]) reviews.sort(BY_RATING[sort]);

  return reviews;
}

function facetsOf(reviews: ProductReview[]): ProductReviewFacets {
  const distribution = emptyDistribution();
  let withMedia = 0;

  for (const review of reviews) {
    const stars = wholeStars(review);
    if (stars !== null) distribution[stars] += 1;
    if (review.media.length) withMedia += 1;
  }

  return { total: reviews.length, withMedia, distribution };
}

/** Average, histogram and media count, all derived from the reviews themselves. */
function summarize(reviews: ProductReview[]): ProductRatingSummary {
  const { distribution, withMedia } = facetsOf(reviews);
  let count = 0;
  let sum = 0;

  for (const review of reviews) {
    const stars = wholeStars(review);
    if (stars === null) continue;
    count += 1;
    sum += review.rating as number;
  }

  return { average: count ? sum / count : 0, count, distribution, withMedia };
}

export async function readProductReviews(
  productId: string,
  query: ProductReviewQuery = {},
  catalog: ReviewCatalog = "b2c",
): Promise<ProductReviewPage> {
  const all = await scanProductReviews(productId, catalog);
  const offset = Math.max(0, query.offset ?? 0);
  const matching = sortReviews(all.filter((review) => matchesQuery(review, query)), query.sort ?? "newest");

  return {
    reviews: matching.slice(offset, offset + PAGE_SIZE),
    total: matching.length,
    offset,
    limit: PAGE_SIZE,
    facets: facetsOf(all),
  };
}

/**
 * Rating snapshot for the review summary and histogram, averaged over the published
 * reviews rather than commercetools' asynchronously recalculated statistics, so a
 * review a shopper just wrote counts immediately.
 */
export async function readProductReviewSummary(
  productId: string,
  catalog: ReviewCatalog = "b2c",
): Promise<ProductRatingSummary> {
  return summarize(await scanProductReviews(productId, catalog));
}

type ApiRoot = NonNullable<ReturnType<typeof getApiRoot>>;

const mediaTypeReady = new Set<ReviewCatalog>();

/** Creates the custom type holding review media once per process and project. */
async function ensureReviewMediaType(apiRoot: ApiRoot, catalog: ReviewCatalog) {
  if (mediaTypeReady.has(catalog)) return;

  try {
    await apiRoot.types().withKey({ key: REVIEW_MEDIA_TYPE_KEY }).get().execute();
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode !== 404) {
      throw new ProductReviewError("Could not attach your photos or video. Please try again.", 503);
    }
    try {
      await apiRoot.types().post({
        body: {
          key: REVIEW_MEDIA_TYPE_KEY,
          name: { en: "Storefront review media" },
          description: { en: "Photos and videos shoppers attach to product reviews." },
          resourceTypeIds: ["review"],
          fieldDefinitions: [{
            name: MEDIA_FIELD,
            label: { en: "Media" },
            type: { name: "String" },
            required: false,
            inputHint: "MultiLine",
          }],
        },
      }).execute();
    } catch {
      throw new ProductReviewError("Could not attach your photos or video. Please try again.", 503);
    }
  }

  mediaTypeReady.add(catalog);
}

export async function createProductReview(
  productId: string,
  input: ProductReviewInput,
  catalog: ReviewCatalog = "b2c",
): Promise<ProductReview> {
  const media = input.media ?? [];
  const { media: _ignored, ...fields } = input;
  const apiRoot = apiRootFor(catalog);

  if (!apiRoot) {
    const { store, reviews } = trainingReviews(productId);
    const review: ProductReview = {
      ...fields,
      media,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    store.set(productId, [review, ...reviews]);
    return review;
  }

  // Only published products can receive reviews through the storefront.
  await apiRoot.productProjections().withId({ ID: productId }).get({
    queryArgs: { staged: false },
  }).execute();
  if (media.length) await ensureReviewMediaType(apiRoot, catalog);

  const { body } = await apiRoot.reviews().post({
    body: {
      ...fields,
      locale: process.env.CTP_LOCALE || "en-US",
      target: { typeId: "product", id: productId },
      ...(media.length
        ? {
            custom: {
              type: { typeId: "type" as const, key: REVIEW_MEDIA_TYPE_KEY },
              fields: { [MEDIA_FIELD]: JSON.stringify(media) },
            },
          }
        : {}),
    },
  }).execute();

  // The freshly created review echoes back its custom fields unexpanded.
  return { ...mapReview(body), media: media.length ? media : mapReview(body).media };
}
