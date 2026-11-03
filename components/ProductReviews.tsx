"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReviewsSection from "@/components/commercetools-ui/organisms/product/product-reviews";
import RatingSnippet from "@/components/commercetools-ui/organisms/product/product-reviews/components/rating-snippet";
import ReviewFormModal, {
  emptyReviewDraft,
  type ReviewDraft,
} from "@/components/commercetools-ui/organisms/product/product-reviews/components/review-form-modal";
import { releaseMediaDrafts } from "@/components/commercetools-ui/organisms/product/product-reviews/components/review-media-field";
import { useToast } from "@/components/Toast";
import type {
  ProductRatingSummary,
  ProductReview,
  ProductReviewPage,
  ProductReviewQuery,
} from "@/lib/types";
import { loadProductReviews, submitProductReview } from "@/lib/reviews-api";

const EMPTY_DISTRIBUTION: ProductRatingSummary["distribution"] = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};
const DEFAULT_QUERY: ProductReviewQuery = {
  offset: 0,
  search: "",
  ratings: [],
  withMedia: false,
  sort: "newest",
};
const SEARCH_DEBOUNCE_MS = 300;

/** Folds a freshly published review into the snapshot the server sent. */
function withReview(
  summary: ProductRatingSummary | null,
  review: ProductReview,
): ProductRatingSummary {
  const base = summary ?? {
    average: 0,
    count: 0,
    distribution: EMPTY_DISTRIBUTION,
    withMedia: 0,
  };
  const rating = review.rating ?? 0;
  const count = base.count + 1;

  return {
    count,
    average: (base.average * base.count + rating) / count,
    distribution: {
      ...base.distribution,
      [rating]: (base.distribution[rating] ?? 0) + 1,
    },
    withMedia: base.withMedia + (review.media.length ? 1 : 0),
  };
}

const isDefaultQuery = ({
  search,
  ratings,
  withMedia,
  sort,
  offset,
}: ProductReviewQuery) =>
  !search?.trim() &&
  !ratings?.length &&
  !withMedia &&
  (sort ?? "newest") === "newest" &&
  !offset;

type ReviewsValue = {
  productName: string;
  page: ProductReviewPage | null;
  summary: ProductRatingSummary | null;
  reviewCount: number;
  loading: boolean;
  listError: string;
  highlightedReviewId: string;
  query: ProductReviewQuery;
  searchValue: string;
  openForm: () => void;
  loadPage: (offset: number) => void;
  changeQuery: (patch: Partial<ProductReviewQuery>) => void;
  changeSearch: (value: string) => void;
  resetFilters: () => void;
  revealReviews: () => void;
};

const ReviewsContext = createContext<ReviewsValue | null>(null);

function useReviews() {
  const value = useContext(ReviewsContext);
  if (!value)
    throw new Error(
      "Product review components must be rendered inside ProductReviewsProvider.",
    );
  return value;
}

export function ProductReviewsProvider({
  productId,
  productName,
  initialReviews,
  initialSummary = null,
  initialError = "",
  onRevealReviews,
  apiBasePath,
  onBeforeWrite,
  children,
}: {
  productId: string;
  productName: string;
  initialReviews: ProductReviewPage | null;
  initialSummary?: ProductRatingSummary | null;
  initialError?: string;
  /** Lets the page open the tab holding the reviews before we scroll to them. */
  onRevealReviews?: () => void;
  /** Review API root for this storefront; defaults to the B2C `/api/products`. */
  apiBasePath?: string;
  /** Return false to keep the review form closed, e.g. to send a guest to sign in. */
  onBeforeWrite?: () => boolean;
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
  const [query, setQuery] = useState<ProductReviewQuery>(DEFAULT_QUERY);
  const [searchValue, setSearchValue] = useState("");
  /** Review published in this session, kept until the server lists it itself. */
  const [publishedReview, setPublishedReview] = useState<ProductReview | null>(
    null,
  );
  const serverRendered = useRef(true);

  const revealReviews = useCallback(() => {
    onRevealReviews?.();
    // The panel may only mount once the tab switch has rendered.
    requestAnimationFrame(() => {
      const target =
        document.getElementById("product-tabs") ??
        document.getElementById("product-reviews");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [onRevealReviews]);

  // The first page came from the server; after that every query change refetches.
  useEffect(() => {
    if (serverRendered.current) {
      serverRendered.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setListError("");

    loadProductReviews(productId, query, apiBasePath)
      .then((result) => !cancelled && setPage(result))
      .catch((error: unknown) => {
        if (cancelled) return;
        setListError(
          error instanceof Error ? error.message : "Unable to load reviews.",
        );
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [productId, query, apiBasePath]);

  // Typing filters the list without a request per keystroke.
  useEffect(() => {
    if (searchValue.trim() === (query.search ?? "").trim()) return;

    const timer = setTimeout(
      () =>
        setQuery((current) => ({ ...current, search: searchValue, offset: 0 })),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchValue, query.search]);

  const changeQuery = useCallback((patch: Partial<ProductReviewQuery>) => {
    // Any filter change starts the list again at its first page.
    setQuery((current) => ({ ...current, offset: 0, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchValue("");
    setQuery(DEFAULT_QUERY);
  }, []);

  const closeForm = useCallback(() => {
    setDraft((current) => {
      releaseMediaDrafts(current.media);
      return emptyReviewDraft;
    });
    setFormOpen(false);
  }, []);

  const submit = useCallback(
    async (values: ReviewDraft) => {
      if (submitting) return;
      setSubmitError("");
      setSubmitting(true);
      try {
        const { review } = await submitProductReview(
          productId,
          {
            authorName: values.authorName,
            title: values.title,
            text: values.text,
            rating: values.rating,
            files: values.media.map((item) => item.file),
          },
          apiBasePath,
        );

        setSummary((current) => withReview(current, review));
        setHighlightedReviewId(review.id);
        setPublishedReview(review);
        releaseMediaDrafts(values.media);
        setDraft(emptyReviewDraft);
        setFormOpen(false);
        showToast("Thank you! Your review has been published.", "success");

        // Show the new review where it belongs: unfiltered and newest first.
        setSearchValue("");
        setQuery({ ...DEFAULT_QUERY });
        revealReviews();
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to submit your review. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [productId, revealReviews, showToast, submitting, apiBasePath],
  );

  /**
   * commercetools indexes a new review asynchronously, so the shopper's own review is
   * kept at the top of the unfiltered first page until the server returns it.
   */
  const visiblePage = useMemo(() => {
    if (!page || !publishedReview || !isDefaultQuery(query)) return page;
    if (page.reviews.some((review) => review.id === publishedReview.id))
      return page;

    return {
      ...page,
      reviews: [publishedReview, ...page.reviews].slice(0, page.limit),
      total: page.total + 1,
      facets: {
        ...page.facets,
        total: page.facets.total + 1,
        withMedia:
          page.facets.withMedia + (publishedReview.media.length ? 1 : 0),
      },
    };
  }, [page, publishedReview, query]);

  const value = useMemo<ReviewsValue>(
    () => ({
      productName,
      page: visiblePage,
      summary,
      reviewCount: summary?.count ?? visiblePage?.facets.total ?? 0,
      loading,
      listError,
      highlightedReviewId,
      query,
      searchValue,
      openForm: () => {
        if (onBeforeWrite?.() === false) return;
        setSubmitError("");
        setFormOpen(true);
      },
      loadPage: (offset: number) =>
        setQuery((current) => ({ ...current, offset })),
      changeQuery,
      changeSearch: setSearchValue,
      resetFilters,
      revealReviews,
    }),
    [
      productName,
      visiblePage,
      summary,
      loading,
      listError,
      highlightedReviewId,
      query,
      searchValue,
      changeQuery,
      resetFilters,
      revealReviews,
      onBeforeWrite,
    ],
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
        onClose={() => !submitting && closeForm()}
      />
    </ReviewsContext.Provider>
  );
}

/** Number of published reviews, for the product tab label. */
export function useProductReviewCount() {
  return useReviews().reviewCount;
}

/** Compact stars + review count shown next to the product title. */
export function ProductRatingSnippet({
  className = "",
}: {
  className?: string;
}) {
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

export function ProductReviewsSection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const {
    productName,
    page,
    summary,
    loading,
    listError,
    highlightedReviewId,
    query,
    searchValue,
    openForm,
    loadPage,
    changeQuery,
    changeSearch,
    resetFilters,
  } = useReviews();

  return (
    <ReviewsSection
      productName={productName}
      page={page}
      summary={summary}
      embedded={embedded}
      loading={loading}
      listError={listError}
      highlightedReviewId={highlightedReviewId}
      query={query}
      searchValue={searchValue}
      onRetry={() => loadPage(page?.offset ?? 0)}
      onPageChange={loadPage}
      onWriteReview={openForm}
      onSearchChange={changeSearch}
      onQueryChange={changeQuery}
      onResetFilters={resetFilters}
    />
  );
}
