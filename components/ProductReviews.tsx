"use client";

import Button from "@/components/commercetools-ui/atoms/button";
import { useState, type FormEvent } from "react";
import type { ProductReviewPage } from "@/lib/types";
import { loadProductReviews, submitProductReview } from "@/lib/reviews-api";

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span aria-hidden="true" className={index < rating ? "filled" : ""} key={index}>★</span>
      ))}
    </span>
  );
}

export function ProductReviews({
  productId,
  initialReviews,
  initialError = "",
}: {
  productId: string;
  initialReviews: ProductReviewPage | null;
  initialError?: string;
}) {
  const [page, setPage] = useState(initialReviews);
  const [listError, setListError] = useState(initialError);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);

  async function loadPage(offset: number) {
    setLoading(true);
    setListError("");
    try {
      setPage(await loadProductReviews(productId, offset));
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || loading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { review } = await submitProductReview(productId, {
        authorName: String(data.get("authorName") ?? ""),
        title: String(data.get("title") ?? ""),
        text: String(data.get("text") ?? ""),
        rating,
      });
      // Show the saved review immediately, even if refreshing the list fails.
      setPage((previous) => ({
        reviews: [review, ...(previous?.offset === 0 ? previous.reviews : [])].slice(0, 5),
        total: (previous?.total ?? 0) + 1,
        offset: 0,
        limit: 5,
      }));
      form.reset();
      setRating(0);
      setSuccess("Thank you! Your review has been published.");
      await loadPage(0);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="product-reviews" id="product-reviews" aria-labelledby="reviews-heading">
      <div className="product-reviews-heading">
        <div>
          <span className="eyebrow">From our community</span>
          <h2 id="reviews-heading">Customer reviews</h2>
        </div>
        {page ? <span>{page.total} {page.total === 1 ? "review" : "reviews"}</span> : null}
      </div>
      <div className="product-reviews-grid">
        <div className="product-reviews-list" aria-busy={loading}>
          {listError ? (
            <div role="alert" className="review-error">
              <p>{listError}</p>
              <Button variant="primary" type="button" disabled={loading || submitting} onClick={() => void loadPage(page?.offset ?? 0)}>Retry loading reviews</Button>
            </div>
          ) : null}
          {page?.total === 0 && !listError ? (
            <div className="review-empty">
              <h3>Be the first to share your experience</h3>
              <p>How does it fit into your everyday life? Your review helps others choose.</p>
            </div>
          ) : null}
          {page?.reviews.map((review) => (
            <article className="product-review" key={review.id}>
              <div className="product-review-meta">
                <strong>{review.authorName}</strong>
                <time dateTime={review.createdAt}>
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(review.createdAt))}
                </time>
              </div>
              {review.rating !== undefined ? <ReviewStars rating={review.rating} /> : null}
              {review.title ? <h3>{review.title}</h3> : null}
              <p>{review.text}</p>
            </article>
          ))}
          {page && page.total > page.limit ? (
            <nav className="review-pagination" aria-label="Review pages">
              <Button variant="primary" type="button" disabled={loading || submitting || page.offset === 0} onClick={() => void loadPage(Math.max(0, page.offset - page.limit))}>Previous</Button>
              <span aria-live="polite">{loading ? "Loading…" : `${page.offset + 1}–${page.offset + page.reviews.length} of ${page.total}`}</span>
              <Button variant="primary" type="button" disabled={loading || submitting || page.offset + page.limit >= page.total || page.offset + page.limit > 10000} onClick={() => void loadPage(page.offset + page.limit)}>Next</Button>
            </nav>
          ) : null}
        </div>
        <form className="product-review-form" onSubmit={submit}>
          <h3>Write a review</h3>
          <p>Share your thoughts with other shoppers. All fields are required.</p>
          <fieldset disabled={submitting} className="review-rating-input">
            <legend>Your rating</legend>
            <div className="review-rating-options">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value}>
                  <input type="radio" name="rating" value={value} required checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} />
                  <span aria-hidden="true" className={value <= rating ? "selected" : ""}>★</span>
                </label>
              ))}
              <span className="review-rating-value">{rating ? `${rating} / 5` : "Select a rating"}</span>
            </div>
          </fieldset>
          <label>Your name<input name="authorName" autoComplete="name" required maxLength={80} disabled={submitting} placeholder="Name shown with your review" /></label>
          <label>Review title<input name="title" required maxLength={120} disabled={submitting} placeholder="Sum up your experience" /></label>
          <label>Your review<textarea name="text" required maxLength={2000} rows={5} disabled={submitting} placeholder="What did you like? What could be better?" /></label>
          <small>Your name and review will be visible to other shoppers.</small>
          {submitError ? <p role="alert" className="review-error">{submitError}</p> : null}
          {success ? <p role="status" className="review-success">{success}</p> : null}
          <Button variant="primary" type="submit" disabled={submitting || loading}>{submitting ? "Submitting…" : "Submit review"}</Button>
        </form>
      </div>
    </section>
  );
}
