import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getApiRoot = vi.hoisted(() => vi.fn());
vi.mock("../lib/ct/client", () => ({ getApiRoot }));

import { createProductReview, readProductReviews, readProductReviewSummary } from "../lib/ct/reviews";
import { reviewMediaError, REVIEW_MEDIA_LIMITS } from "../lib/review-media";
import { GET, POST } from "../app/api/products/[productId]/reviews/route";
import { GET as GET_MEDIA } from "../app/api/review-media/[mediaId]/route";

const input = { authorName: "Alex", title: "Great chair", text: "Comfortable all day.", rating: 5 };
const context = (productId = "p1") => ({ params: Promise.resolve({ productId }) });
const request = (body: unknown) => new Request("http://localhost/api/products/p1/reviews", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const upload = (files: File[], values: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [name, value] of Object.entries({ ...input, rating: String(input.rating), ...values })) {
    form.set(name, String(value));
  }
  for (const file of files) form.append("media", file);
  return new Request("http://localhost/api/products/p1/reviews", { method: "POST", body: form });
};
const photo = (name = "sofa.jpg") => new File([new Uint8Array([1, 2, 3, 4])], name, { type: "image/jpeg" });
const clip = () => new File([new Uint8Array([5, 6, 7])], "tour.mp4", { type: "video/mp4" });

let mediaDir = "";

beforeEach(async () => {
  getApiRoot.mockReset().mockReturnValue(null);
  globalThis.__trainingProductReviews = undefined;
  mediaDir = await mkdtemp(path.join(tmpdir(), "review-media-"));
  vi.stubEnv("REVIEW_MEDIA_DIR", mediaDir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(mediaDir, { recursive: true, force: true });
});

describe("product reviews", () => {
  it("saves a trimmed review and reads it back only for its product", async () => {
    const result = await POST(request({ ...input, authorName: "  Alex  ", title: "  Great chair  " }), context());
    expect(result.status).toBe(201);
    const { review } = await result.json();
    expect(review).toMatchObject({ ...input, media: [] });
    expect(review.id).toBeTruthy();
    const response = await GET(new Request("http://localhost/api/products/p1/reviews"), context());
    expect(await response.json()).toMatchObject({ reviews: [review], total: 1 });
    expect(await readProductReviews("p2")).toMatchObject({ reviews: [], total: 0 });
  });

  it.each([
    { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "5" },
    { authorName: "   " }, { title: "" }, { text: "\n  " },
    { authorName: "a".repeat(81) }, { title: "a".repeat(121) }, { text: "a".repeat(2001) },
  ])("rejects invalid review input %j without saving", async (patch) => {
    const result = await POST(request({ ...input, ...patch }), context());
    expect(result.status).toBe(400);
    expect(getApiRoot).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and nonexistent demo products", async () => {
    const malformed = new Request("http://localhost/api/products/p1/reviews", { method: "POST", body: "{" });
    expect((await POST(malformed, context())).status).toBe(400);
    expect((await POST(request(input), context("missing"))).status).toBe(404);
  });

  it("paginates newest-first and rejects invalid offsets", async () => {
    for (let i = 0; i < 7; i++) await createProductReview("p1", { ...input, title: `Review ${i}` });
    const first = await readProductReviews("p1");
    const second = await readProductReviews("p1", { offset: 5 });
    expect(first.total).toBe(7);
    expect(first.reviews.map((review) => review.title)).toEqual(["Review 6", "Review 5", "Review 4", "Review 3", "Review 2"]);
    expect(second.reviews.map((review) => review.title)).toEqual(["Review 1", "Review 0"]);
    for (const offset of ["-1", "1.5", "10001", "invalid"]) {
      expect((await GET(new Request(`http://localhost/api/products/p1/reviews?offset=${offset}`), context())).status).toBe(400);
    }
  });

  it("queries every review of the product once and returns only public fields", async () => {
    const get = vi.fn(() => ({ execute: vi.fn().mockResolvedValue({ body: {
      results: [{ ...input, id: "review-1", createdAt: "2026-09-04T00:00:00Z", customer: { id: "private-customer" }, custom: { fields: { secret: "x" } } }],
    } }) }));
    getApiRoot.mockReturnValue({ reviews: () => ({ get }) });
    const result = await readProductReviews("live-product");
    expect(get).toHaveBeenCalledWith({ queryArgs: {
      where: 'target(typeId="product" and id="live-product") and includedInStatistics=true',
      sort: ["createdAt desc", "id desc"], limit: 500, withTotal: false, expand: ["custom.type"],
    } });
    expect(result).toMatchObject({ total: 1, offset: 0 });
    expect(result.reviews[0]).not.toHaveProperty("customer");
    expect(result.reviews[0]).not.toHaveProperty("custom");
    expect(result.reviews[0].media).toEqual([]);
  });

  it("creates a live product review without accepting forged customer or moderation data", async () => {
    const checkProduct = vi.fn().mockResolvedValue({ body: { id: "live-product" } });
    const projectionGet = vi.fn(() => ({ execute: checkProduct }));
    const withId = vi.fn(() => ({ get: projectionGet }));
    const post = vi.fn(() => ({ execute: vi.fn().mockResolvedValue({ body: { ...input, id: "r1", createdAt: "2026-09-04T00:00:00Z" } }) }));
    getApiRoot.mockReturnValue({ productProjections: () => ({ withId }), reviews: () => ({ post }) });
    const result = await POST(request({ ...input, customer: { id: "someone-else" }, state: { id: "approved" } }), context("live-product"));
    expect(result.status).toBe(201);
    expect(withId).toHaveBeenCalledWith({ ID: "live-product" });
    expect(projectionGet).toHaveBeenCalledWith({ queryArgs: { staged: false } });
    expect(post).toHaveBeenCalledWith({ body: { ...input, locale: expect.any(String), target: { typeId: "product", id: "live-product" } } });
  });

  it("does not create a review for an unpublished/missing live product", async () => {
    const post = vi.fn();
    getApiRoot.mockReturnValue({
      productProjections: () => ({ withId: () => ({ get: () => ({ execute: vi.fn().mockRejectedValue({ statusCode: 404 }) }) }) }),
      reviews: () => ({ post }),
    });
    expect((await POST(request(input), context("missing"))).status).toBe(404);
    expect(post).not.toHaveBeenCalled();
  });

  it("averages the ratings of the reviews themselves, training or live", async () => {
    expect(await readProductReviewSummary("p1")).toEqual({
      average: 0, count: 0, withMedia: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    for (const rating of [5, 4, 5]) await createProductReview("p1", { ...input, rating });
    expect(await readProductReviewSummary("p1")).toMatchObject({
      average: 14 / 3, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
    });

    // Live projects average the published reviews too, rather than commercetools'
    // asynchronously recalculated statistics.
    getApiRoot.mockReturnValue({ reviews: () => ({ get: () => ({ execute: vi.fn().mockResolvedValue({ body: { results: [
      { ...input, id: "a", rating: 4, createdAt: "2026-09-04T00:00:00Z" },
      { ...input, id: "b", rating: 1, createdAt: "2026-09-03T00:00:00Z" },
    ] } }) }) }) });
    expect(await readProductReviewSummary("live-product")).toMatchObject({
      average: 2.5, count: 2, distribution: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 0 },
    });
  });

  it("surfaces live failures safely without falling back to training data", async () => {
    getApiRoot.mockReturnValue({ reviews: () => ({ get: () => ({ execute: vi.fn().mockRejectedValue(new Error("private upstream details")) }) }) });
    const response = await GET(new Request("http://localhost/api/products/p1/reviews"), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Reviews are temporarily unavailable. Please try again." });
    expect(globalThis.__trainingProductReviews).toBeUndefined();
  });
});

describe("review media uploads", () => {
  it("stores the attachments and serves them back with their own type", async () => {
    const result = await POST(upload([photo(), photo("angle.png")]), context());
    expect(result.status).toBe(201);
    const { review } = await result.json();

    expect(review.media).toHaveLength(2);
    expect(review.media[0]).toMatchObject({ type: "image", contentType: "image/jpeg", name: "sofa.jpg" });
    expect(review.media[0].url).toBe(`/api/review-media/${review.media[0].id}`);

    const media = await GET_MEDIA(new Request("http://localhost"), { params: Promise.resolve({ mediaId: review.media[0].id }) });
    expect(media.status).toBe(200);
    expect(media.headers.get("content-type")).toBe("image/jpeg");
    expect(media.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));

    const listed = await readProductReviews("p1");
    expect(listed.reviews[0].media).toHaveLength(2);
    expect(listed.facets.withMedia).toBe(1);
  });

  it("refuses to serve media that was never stored", async () => {
    for (const mediaId of ["../../etc/passwd", "not-an-id", "11111111-1111-1111-1111-111111111111"]) {
      const response = await GET_MEDIA(new Request("http://localhost"), { params: Promise.resolve({ mediaId }) });
      expect(response.status).toBe(404);
    }
  });

  it.each([
    { files: [photo(), photo(), photo(), photo()], message: "Attach up to 3 photos." },
    { files: [photo(), clip()], message: "Attach up to 3 photos or 1 video, not both." },
    { files: [clip(), clip()], message: "Attach up to 3 photos or 1 video, not both." },
    { files: [new File([new Uint8Array([1])], "malware.svg", { type: "image/svg+xml" })], message: "Attach JPEG, PNG, WebP, GIF or AVIF photos, or an MP4, WebM or MOV video." },
  ])("rejects an invalid attachment set without saving the review", async ({ files, message }) => {
    const response = await POST(upload(files), context());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: message });
    expect(await readProductReviews("p1")).toMatchObject({ total: 0 });
  });

  it("holds every upload under the published size limit", () => {
    expect(reviewMediaError([{ type: "image/png", size: REVIEW_MEDIA_LIMITS.maxBytes + 1 }]))
      .toBe("Each file has to stay under 100 MB.");
    expect(reviewMediaError([{ type: "video/mp4", size: REVIEW_MEDIA_LIMITS.maxBytes }])).toBeNull();
    expect(reviewMediaError([])).toBeNull();
  });

  it("keeps a single video as the whole attachment set", async () => {
    const response = await POST(upload([clip()]), context());
    expect(response.status).toBe(201);
    const { review } = await response.json();
    expect(review.media).toEqual([expect.objectContaining({ type: "video", contentType: "video/mp4" })]);
  });
});

describe("searching, filtering and sorting reviews", () => {
  const seed = async () => {
    await createProductReview("p1", { authorName: "Alex", title: "Sturdy frame", text: "Holds up after a year.", rating: 5, media: [] });
    await createProductReview("p1", { authorName: "Bo", title: "Too firm", text: "The cushion is hard.", rating: 2, media: [] });
    await POST(upload([photo()], { authorName: "Cam", title: "Looks great", text: "See the photo for the colour.", rating: "4" }), context());
  };

  it("filters by rating, by media and by free text", async () => {
    await seed();

    expect((await readProductReviews("p1", { ratings: [5] })).reviews.map((review) => review.title)).toEqual(["Sturdy frame"]);
    expect((await readProductReviews("p1", { ratings: [5, 4] })).reviews.map((review) => review.title)).toEqual(["Looks great", "Sturdy frame"]);
    expect((await readProductReviews("p1", { withMedia: true })).reviews.map((review) => review.title)).toEqual(["Looks great"]);
    expect((await readProductReviews("p1", { search: "cushion" })).reviews.map((review) => review.title)).toEqual(["Too firm"]);
    // Search covers the author and every term has to match.
    expect((await readProductReviews("p1", { search: "alex" })).reviews.map((review) => review.title)).toEqual(["Sturdy frame"]);
    expect((await readProductReviews("p1", { search: "colour photo" })).reviews.map((review) => review.title)).toEqual(["Looks great"]);
    expect((await readProductReviews("p1", { search: "nothing here" })).total).toBe(0);
  });

  it("sorts by date or rating and always reports the unfiltered facets", async () => {
    await seed();

    expect((await readProductReviews("p1", { sort: "highest" })).reviews.map((review) => review.rating)).toEqual([5, 4, 2]);
    expect((await readProductReviews("p1", { sort: "lowest" })).reviews.map((review) => review.rating)).toEqual([2, 4, 5]);
    expect((await readProductReviews("p1", { sort: "oldest" })).reviews.map((review) => review.title)).toEqual(["Sturdy frame", "Too firm", "Looks great"]);

    const filtered = await readProductReviews("p1", { ratings: [5] });
    expect(filtered.total).toBe(1);
    expect(filtered.facets).toEqual({ total: 3, withMedia: 1, distribution: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 } });
  });

  it("accepts the filters over the API and rejects nonsense", async () => {
    await seed();

    const response = await GET(new Request("http://localhost/api/products/p1/reviews?rating=5,4&sort=lowest&media=with&q=photo"), context());
    expect(response.status).toBe(200);
    expect((await response.json()).reviews.map((review: { title: string }) => review.title)).toEqual(["Looks great"]);

    for (const search of ["rating=9", "rating=5,", "sort=best", "media=maybe", `q=${"a".repeat(121)}`]) {
      expect((await GET(new Request(`http://localhost/api/products/p1/reviews?${search}`), context())).status).toBe(400);
    }
  });
});
