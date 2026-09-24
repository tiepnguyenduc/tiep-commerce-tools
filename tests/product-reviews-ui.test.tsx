import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ReviewsSection from "../components/commercetools-ui/organisms/product/product-reviews";
import ReviewFormModal, {
  emptyReviewDraft,
  type ReviewDraft,
} from "../components/commercetools-ui/organisms/product/product-reviews/components/review-form-modal";
import type { ProductRatingSummary, ProductReview, ProductReviewPage } from "../lib/types";

vi.mock("../components/commercetools-ui/organisms/modal/index", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));

const summary: ProductRatingSummary = {
  average: 4.5,
  count: 8,
  withMedia: 2,
  distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 5 },
};

const reviews: ProductReview[] = [
  { id: "r1", authorName: "Jordan", title: "Elegant", text: "Lighter than it looks.", rating: 5, createdAt: "2026-09-04T00:00:00.000Z", media: [
    { id: "11111111-1111-1111-1111-111111111111", type: "image", url: "/api/review-media/11111111-1111-1111-1111-111111111111", contentType: "image/jpeg" },
    { id: "22222222-2222-2222-2222-222222222222", type: "video", url: "/api/review-media/22222222-2222-2222-2222-222222222222", contentType: "video/mp4" },
  ] },
  { id: "r2", authorName: "Sam", title: "Solid", text: "Does the job.", rating: 4, createdAt: "2026-09-03T00:00:00.000Z", media: [] },
];

const page: ProductReviewPage = {
  reviews,
  total: 8,
  offset: 0,
  limit: 5,
  facets: { total: 8, withMedia: 2, distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 5 } },
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

const withFilters = (props: Partial<Parameters<typeof ReviewsSection>[0]> = {}) =>
  render({ onSearchChange: noop, onQueryChange: noop, onResetFilters: noop, ...props });

const renderForm = (draft: ReviewDraft = emptyReviewDraft) =>
  renderToStaticMarkup(
    <ReviewFormModal
      isOpen
      productName="Art Deco Coffee Table"
      draft={draft}
      onDraftChange={noop}
      onSubmit={noop}
      onClose={noop}
    />,
  );

describe("product reviews section", () => {
  it("shows the rating snapshot, histogram and every loaded review", () => {
    const html = render();
    expect(html).toContain("4.5");
    expect(html).toContain("Based on 8 reviews");
    expect(html).toContain("2 with photos or video");
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
    const html = withFilters({
      summary: null,
      page: { reviews: [], total: 0, offset: 0, limit: 5, facets: { total: 0, withMedia: 0, distribution: {} } },
    });
    expect(html).toContain("Be the first to review Art Deco Coffee Table");
    expect(html).not.toContain("Based on");
    expect(html).not.toContain("of 0");
    // Nothing to filter yet, so the toolbar stays out of the way.
    expect(html).not.toContain("Search reviews");
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

  it("shows the media a shopper attached to their review", () => {
    const html = render();
    expect(html).toContain('aria-label="Open Photo 1 of 2 from Jordan"');
    expect(html).toContain('aria-label="Open Video 2 of 2 from Jordan"');
    expect(html).toContain("/api/review-media/11111111-1111-1111-1111-111111111111");
  });

  it("offers search, rating and media filters with their counts", () => {
    const html = withFilters();
    expect(html).toContain("Search reviews");
    expect(html).toContain('aria-label="5 stars, 5 reviews"');
    expect(html).toContain('aria-label="3 stars, 1 review"');
    expect(html).toContain("With photos or video");
    expect(html).toContain("Most recent");
    expect(html).toContain("Highest rated");
    // Ratings nobody used cannot be selected.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="1 star, 0 reviews"/);
  });

  it("reports how many reviews the active filters matched", () => {
    const html = withFilters({
      query: { ratings: [5], sort: "newest" },
      page: { ...page, reviews: [reviews[0]], total: 5 },
    });
    expect(html).toContain("5 of 8 reviews match your filters");
    expect(html).toContain("Clear filters");
  });

  it("explains an empty result instead of pretending the product has no reviews", () => {
    const html = withFilters({
      query: { ratings: [2] },
      page: { ...page, reviews: [], total: 0 },
    });
    expect(html).toContain("No reviews match your filters");
    expect(html).not.toContain("Be the first to review");
  });
});

describe("review form media field", () => {
  it("invites photos or a video and states the limits", () => {
    const html = renderForm();
    expect(html).toContain("Add photos or a video");
    expect(html).toContain("Upload up to 3 photos or 1 video. Maximum file size: 100 MB.");
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"');
    expect(html).toContain("Choose files");
  });

  it("previews each attachment with a way to take it back", () => {
    const html = renderForm({
      ...emptyReviewDraft,
      media: [
        { id: "a", file: new File([new Uint8Array([1])], "sofa.jpg", { type: "image/jpeg" }), type: "image", previewUrl: "blob:sofa" },
      ],
    });
    expect(html).toContain('src="blob:sofa"');
    expect(html).toContain('aria-label="Remove sofa.jpg"');
    expect(html).toContain("1 KB");
  });
});
