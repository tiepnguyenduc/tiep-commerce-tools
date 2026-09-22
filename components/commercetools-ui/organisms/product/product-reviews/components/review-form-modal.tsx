"use client";
import { FC, FormEvent, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/commercetools-ui/atoms/button/index';
import Input from '@/components/commercetools-ui/atoms/input/index';
import Textarea from '@/components/commercetools-ui/atoms/textarea/index';
import Modal from '@/components/commercetools-ui/organisms/modal/index';
import RatingInput from '@/components/commercetools-ui/organisms/product/product-reviews/components/rating-input';

export interface ReviewDraft {
  rating: number;
  authorName: string;
  title: string;
  text: string;
}

export const emptyReviewDraft: ReviewDraft = { rating: 0, authorName: '', title: '', text: '' };

/** Mirrors the limits the reviews API enforces, so nothing round-trips to fail. */
const LIMITS = { authorName: 80, title: 120, text: 2000 };

type FieldErrors = Partial<Record<keyof ReviewDraft, string>>;

const validate = ({ rating, authorName, title, text }: ReviewDraft): FieldErrors => ({
  ...(rating < 1 || rating > 5 ? { rating: 'Choose a rating from 1 to 5 stars.' } : {}),
  ...(authorName.trim() ? {} : { authorName: 'Enter the name to show with your review.' }),
  ...(title.trim() ? {} : { title: 'Add a short summary of your experience.' }),
  ...(text.trim() ? {} : { text: 'Tell other shoppers what you think.' }),
});

export interface ReviewFormModalProps {
  isOpen: boolean;
  productName: string;
  draft: ReviewDraft;
  onDraftChange: (draft: ReviewDraft) => void;
  onSubmit: (draft: ReviewDraft) => void;
  onClose: () => void;
  submitting?: boolean;
  /** Failure coming back from the server. */
  error?: string;
}

const ReviewFormModal: FC<ReviewFormModalProps> = ({
  isOpen,
  productName,
  draft,
  onDraftChange,
  onSubmit,
  onClose,
  submitting = false,
  error = '',
}) => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const update = (patch: Partial<ReviewDraft>) => {
    onDraftChange({ ...draft, ...patch });
    // Clear a field's error as soon as the shopper starts fixing it.
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof ReviewDraft>) delete next[key];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(draft);
    setErrors(nextErrors);

    const firstInvalid = (['rating', 'authorName', 'title', 'text'] as const).find((key) => nextErrors[key]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    onSubmit(draft);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      preventScroll
      shouldCloseOnEsc={!submitting}
      shouldCloseOnOverlayClick={!submitting}
      onRequestClose={onClose}
      contentLabel={`Write a review for ${productName}`}
      className="ct-ui flex flex-col"
      style={{
        content: {
          width: 'min(640px, 94vw)',
          maxWidth: '94vw',
          maxHeight: '92vh',
          padding: 0,
          border: 0,
          background: '#fff',
        },
        overlay: { backgroundColor: 'rgba(17, 23, 20, 0.6)' },
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-16 border-b border-neutral-400 px-20 py-16 md:px-28">
        <div className="min-w-0">
          <h2 className="text-18 font-semibold text-gray-700 md:text-20">Write a review</h2>
          <p className="mt-2 truncate text-14 text-gray-500">
            You&apos;re reviewing: <span className="font-medium text-gray-600">{productName}</span>
          </p>
        </div>

        <Button
          variant="secondary"
          size="icon"
          type="button"
          aria-label="Close review form"
          disabled={submitting}
          className="!rounded-full"
          onClick={onClose}
        >
          <XMarkIcon className="size-20" />
        </Button>
      </header>

      <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="flex min-h-0 grow flex-col gap-20 overflow-y-auto px-20 py-20 md:px-28">
          <RatingInput
            value={draft.rating}
            onChange={(rating) => update({ rating })}
            disabled={submitting}
            error={errors.rating}
          />

          <Input
            name="authorName"
            label="Your name"
            required
            autoComplete="name"
            maxLength={LIMITS.authorName}
            disabled={submitting}
            placeholder="Name shown with your review"
            value={draft.authorName}
            error={errors.authorName}
            hideCheckIcon
            onChange={(event) => update({ authorName: event.target.value })}
          />

          <Input
            name="title"
            label="Review title"
            required
            maxLength={LIMITS.title}
            disabled={submitting}
            placeholder="Sum up your experience"
            value={draft.title}
            error={errors.title}
            hideCheckIcon
            onChange={(event) => update({ title: event.target.value })}
          />

          <div>
            <label className="mb-8 block text-14 font-medium leading-loose text-gray-600" htmlFor="review-text">
              Your review *
            </label>
            <Textarea
              id="review-text"
              name="text"
              required
              rows={6}
              maxLength={LIMITS.text}
              disabled={submitting}
              placeholder="What did you like? What could be better?"
              value={draft.text}
              aria-describedby="review-text-hint"
              className={errors.text ? 'border-red-500 focus:border-red-500' : ''}
              onChange={(event) => update({ text: event.target.value })}
            />
            <div className="mt-6 flex items-start justify-between gap-12" id="review-text-hint">
              {errors.text ? (
                <p className="text-12 font-medium text-red-500" role="alert">
                  {errors.text}
                </p>
              ) : (
                <p className="text-12 text-gray-500">Your name and review will be visible to other shoppers.</p>
              )}
              <span className="shrink-0 text-12 tabular-nums text-gray-500">
                {draft.text.length} / {LIMITS.text}
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-100 px-12 py-10 text-14 font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-10 border-t border-neutral-400 px-20 py-16 md:flex-row md:justify-end md:px-28">
          <Button variant="secondary" type="button" disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {submitting ? 'Submitting…' : 'Submit review'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
};

export default ReviewFormModal;
