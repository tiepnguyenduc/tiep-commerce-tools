"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ReviewsSection from "@/components/commercetools-ui/organisms/product/product-reviews";
import RatingSnippet from "@/components/commercetools-ui/organisms/product/product-reviews/components/rating-snippet";
import ReviewFormModal, {
  emptyReviewDraft,
  type ReviewDraft,
} from "@/components/commercetools-ui/organisms/product/product-reviews/components/review-form-modal";
import { useToast } from "@/components/Toast";
import type { ProductRatingSummary, ProductReviewPage } from "@/lib/types";
import { loadProductReviews, submitProductReview } from "@/lib/reviews-api";

const EMPTY_DISTRIBUTION: ProductRatingSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Folds a freshly published review into the snapshot the server sent. */
function withReview(summary: ProductRatingSummary | null, rating: number): ProductRatingSummary {
  const base = summary ?? { average: 0, count: 0, distribution: EMPTY_DISTRIBUTION };
  const count = base.count + 1;
  return {
    count,
    average: (base.average * base.count + rating) / count,
    distribution: { ...base.distribution, [rating]: (base.distribution[rating] ?? 0) + 1 },
  };
}

type ReviewsValue = {
  productName: string;
  page: ProductReviewPage | null;
  summary: ProductRatingSummary | null;
  reviewCount: number;
  loading: boolean;
  listError: string;
  highlightedReviewId: string;
  openForm: () => void;
  loadPage: (offset: number) => void;
  revealReviews: () => void;
};

const ReviewsContext = createContext<ReviewsValue | null>(null);

function useReviews() {
  const value = useContext(ReviewsContext);
  if (!value) throw new Error("Product review components must be rendered inside ProductReviewsProvider.");
  return value;
}

export function ProductReviewsProvider({
  productId,
  productName,
  initialReviews,
  initialSummary = null,
  initialError = "",
  onRevealReviews,
  children,
}: {
  productId: string;
  productName: string;
  initialReviews: ProductReviewPage | null;
  initialSummary?: ProductRatingSummary | null;
  initialError?: string;
  /** Lets the page open the tab holding the reviews before we scroll to them. */
  onRevealReviews?: () => void;
  children: ReactNode;
}) {
  const showToast = useToast();
  const [page, setPage] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [listError, setListError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<ReviewDraft>(emptyReviewDraft);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [highlightedReviewId, setHighlightedReviewId] = useState("");

  const revealReviews = useCallback(() => {
    onRevealReviews?.();
    // The panel may only mount once the tab switch has rendered.
    requestAnimationFrame(() => {
      const target = document.getElementById("product-tabs") ?? document.getElementById("product-reviews");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [onRevealReviews]);

  const loadPage = useCallback(
    async (offset: number) => {
      setLoading(true);
      setListError("");
      try {
        setPage(await loadProductReviews(productId, offset));
      } catch (error) {
        setListError(error instanceof Error ? error.message : "Unable to load reviews.");
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  const submit = useCallback(
    async (values: ReviewDraft) => {
      if (submitting) return;
      setSubmitError("");
      setSubmitting(true);
      try {
        const { review } = await submitProductReview(productId, values);

        setSummary((current) => withReview(current, values.rating));
        setHighlightedReviewId(review.id);
        setDraft(emptyReviewDraft);
        setFormOpen(false);
        showToast("Thank you! Your review has been published.", "success");

        // Re-read the first page, but never let eventual consistency hide the
        // review the shopper just wrote.
        const refreshed = await loadProductReviews(productId, 0).catch(() => null);
        setPage((previous) => {
          const base = refreshed ?? { reviews: [], total: previous?.total ?? 0, offset: 0, limit: previous?.limit ?? 5 };
          if (base.reviews.some((item) => item.id === review.id)) return base;
          return {
            ...base,
            reviews: [review, ...base.reviews].slice(0, base.limit),
            total: base.total + 1,
          };
        });

        revealReviews();
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to submit your review. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [productId, revealReviews, showToast, submitting],
  );

  const value = useMemo<ReviewsValue>(
    () => ({
      productName,
      page,
      summary,
      reviewCount: summary?.count ?? page?.total ?? 0,
      loading,
      listError,
      highlightedReviewId,
      openForm: () => {
        setSubmitError("");
        setFormOpen(true);
      },
      loadPage: (offset: number) => void loadPage(offset),
      revealReviews,
    }),
    [productName, page, summary, loading, listError, highlightedReviewId, loadPage, revealReviews],
  );

  return (
    <ReviewsContext.Provider value={value}>
      {children}
      <ReviewFormModal
        isOpen={formOpen}
        productName={productName}
        draft={draft}
        submitting={submitting}
        error={submitError}
        onDraftChange={setDraft}
        onSubmit={(values) => void submit(values)}
        onClose={() => !submitting && setFormOpen(false)}
      />
    </ReviewsContext.Provider>
  );
}

/** Number of published reviews, for the product tab label. */
export function useProductReviewCount() {
  return useReviews().reviewCount;
}

/** Compact stars + review count shown next to the product title. */
export function ProductRatingSnippet({ className = "" }: { className?: string }) {
  const { summary, openForm, revealReviews } = useReviews();
  return (
    <RatingSnippet
      className={className}
      summary={summary}
      onShowReviews={revealReviews}
      onWriteReview={openForm}
    />
  );
}

export function ProductReviewsSection({ embedded = false }: { embedded?: boolean }) {
  const { productName, page, summary, loading, listError, highlightedReviewId, openForm, loadPage } = useReviews();

  return (
    <ReviewsSection
      productName={productName}
      page={page}
      summary={summary}
      embedded={embedded}
      loading={loading}
      listError={listError}
      highlightedReviewId={highlightedReviewId}
      onRetry={() => loadPage(page?.offset ?? 0)}
      onPageChange={loadPage}
      onWriteReview={openForm}
    />
  );
}
