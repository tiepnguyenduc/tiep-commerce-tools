import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReviewsSection from "../components/commercetools-ui/organisms/product/product-reviews";
import type { ProductRatingSummary, ProductReviewPage } from "../lib/types";

const summary: ProductRatingSummary = {
  average: 4.5,
  count: 8,
  distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 5 },
};

const page: ProductReviewPage = {
  reviews: [
    { id: "r1", authorName: "Jordan", title: "Elegant", text: "Lighter than it looks.", rating: 5, createdAt: "2026-09-04T00:00:00.000Z" },
    { id: "r2", authorName: "Sam", title: "Solid", text: "Does the job.", rating: 4, createdAt: "2026-09-03T00:00:00.000Z" },
  ],
  total: 8,
  offset: 0,
  limit: 5,
};

const noop = () => {};

const render = (props: Partial<Parameters<typeof ReviewsSection>[0]> = {}) =>
  renderToStaticMarkup(
    <ReviewsSection
      productName="Art Deco Coffee Table"
      page={page}
      summary={summary}
      onRetry={noop}
      onPageChange={noop}
      onWriteReview={noop}
      {...props}
    />,
  );

describe("product reviews section", () => {
  it("shows the rating snapshot, histogram and every loaded review", () => {
    const html = render();
    expect(html).toContain("4.5");
    expect(html).toContain("Based on 8 reviews");
    expect(html).toContain("5 stars: 5 reviews (63%)");
    expect(html).toContain("3 stars: 1 review (13%)");
    expect(html).toContain("Elegant");
    expect(html).toContain("Solid");
    expect(html).toContain("1–2 of 8");
  });

  it("highlights only the review published in this session", () => {
    expect(render()).not.toContain("border-green-500");
    expect(render({ highlightedReviewId: "r2" }).match(/border-green-500/g)).toHaveLength(1);
  });

  it("invites the first review when the product has none", () => {
    const html = render({ summary: null, page: { reviews: [], total: 0, offset: 0, limit: 5 } });
    expect(html).toContain("Be the first to review Art Deco Coffee Table");
    expect(html).not.toContain("Based on");
    expect(html).not.toContain("of 0");
  });

  it("drops its own heading when a product tab already frames it", () => {
    const html = render({ embedded: true });
    expect(html).not.toContain("From our community");
    expect(html).not.toContain("Customer reviews</h2>");
    expect(html).toContain("Write a review");
    expect(html).toContain("Based on 8 reviews");
  });

  it("surfaces a load failure with a retry affordance", () => {
    const html = render({ listError: "Reviews are temporarily unavailable." });
    expect(html).toContain("Reviews are temporarily unavailable.");
    expect(html).toContain("Retry");
  });
});
