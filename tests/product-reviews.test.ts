import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getApiRoot = vi.hoisted(() => vi.fn());
vi.mock("../lib/ct/client", () => ({ getApiRoot }));

import { createProductReview, readProductReviews } from "../lib/ct/reviews";
import { GET, POST } from "../app/api/products/[productId]/reviews/route";

const input = { authorName: "Alex", title: "Great chair", text: "Comfortable all day.", rating: 5 };
const context = (productId = "p1") => ({ params: Promise.resolve({ productId }) });
const request = (body: unknown) => new Request("http://localhost/api/products/p1/reviews", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

beforeEach(() => {
  getApiRoot.mockReset().mockReturnValue(null);
  globalThis.__trainingProductReviews = undefined;
});

describe("product reviews", () => {
  it("saves a trimmed review and reads it back only for its product", async () => {
    const result = await POST(request({ ...input, authorName: "  Alex  ", title: "  Great chair  " }), context());
    expect(result.status).toBe(201);
    const { review } = await result.json();
    expect(review).toMatchObject(input);
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
    const second = await readProductReviews("p1", 5);
    expect(first.total).toBe(7);
    expect(first.reviews.map((review) => review.title)).toEqual(["Review 6", "Review 5", "Review 4", "Review 3", "Review 2"]);
    expect(second.reviews.map((review) => review.title)).toEqual(["Review 1", "Review 0"]);
    for (const offset of ["-1", "1.5", "10001", "invalid"]) {
      expect((await GET(new Request(`http://localhost/api/products/p1/reviews?offset=${offset}`), context())).status).toBe(400);
    }
  });

  it("queries public reviews for the exact product and returns only public fields", async () => {
    const get = vi.fn(() => ({ execute: vi.fn().mockResolvedValue({ body: {
      results: [{ ...input, id: "review-1", createdAt: "2026-09-04T00:00:00Z", customer: { id: "private-customer" }, custom: { private: true } }],
      total: 11,
    } }) }));
    getApiRoot.mockReturnValue({ reviews: () => ({ get }) });
    const result = await readProductReviews("live-product", 5);
    expect(get).toHaveBeenCalledWith({ queryArgs: {
      where: 'target(typeId="product" and id="live-product") and includedInStatistics=true',
      sort: ["createdAt desc", "id desc"], limit: 5, offset: 5, withTotal: true,
    } });
    expect(result).toMatchObject({ total: 11, offset: 5 });
    expect(result.reviews[0]).not.toHaveProperty("customer");
    expect(result.reviews[0]).not.toHaveProperty("custom");
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

  it("surfaces live failures safely without falling back to training data", async () => {
    getApiRoot.mockReturnValue({ reviews: () => ({ get: () => ({ execute: vi.fn().mockRejectedValue(new Error("private upstream details")) }) }) });
    const response = await GET(new Request("http://localhost/api/products/p1/reviews"), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Reviews are temporarily unavailable. Please try again." });
    expect(globalThis.__trainingProductReviews).toBeUndefined();
  });
});
