import { defineMessages } from 'react-intl';

export default defineMessages({
  untitled: {
    id: 'ReviewDetails.untitled',
    defaultMessage: 'Review without title',
  },
  subtitle: {
    id: 'ReviewDetails.subtitle',
    defaultMessage: 'For {product} · written on {createdAt}',
  },
  backToList: {
    id: 'ReviewDetails.backToList',
    defaultMessage: 'Product reviews',
  },
  loadError: {
    id: 'ReviewDetails.loadError',
    defaultMessage: 'The review could not be loaded. Please try again.',
  },
  authorNameLabel: {
    id: 'ReviewDetails.authorNameLabel',
    defaultMessage: 'Author name',
  },
  titleLabel: {
    id: 'ReviewDetails.titleLabel',
    defaultMessage: 'Title',
  },
  textLabel: {
    id: 'ReviewDetails.textLabel',
    defaultMessage: 'Review text',
  },
  ratingLabel: {
    id: 'ReviewDetails.ratingLabel',
    defaultMessage: 'Rating',
  },
  ratingOption: {
    id: 'ReviewDetails.ratingOption',
    defaultMessage: '{rating, plural, one {# star} other {# stars}}',
  },
  moderationTitle: {
    id: 'ReviewDetails.moderationTitle',
    defaultMessage: 'Moderation',
  },
  moderationHint: {
    id: 'ReviewDetails.moderationHint',
    defaultMessage:
      'Hidden reviews disappear from the storefront and no longer count towards the product rating.',
  },
  moderationUnavailable: {
    id: 'ReviewDetails.moderationUnavailable',
    defaultMessage:
      'Create the moderation states on the reviews list to approve or hide reviews.',
  },
  approve: {
    id: 'ReviewDetails.approve',
    defaultMessage: 'Approve and show',
  },
  reject: {
    id: 'ReviewDetails.reject',
    defaultMessage: 'Hide from storefront',
  },
  approved: {
    id: 'ReviewDetails.approved',
    defaultMessage: 'The review is approved and shown on the storefront.',
  },
  rejected: {
    id: 'ReviewDetails.rejected',
    defaultMessage: 'The review is hidden from the storefront.',
  },
  saved: {
    id: 'ReviewDetails.saved',
    defaultMessage: 'The review has been saved.',
  },
  delete: {
    id: 'ReviewDetails.delete',
    defaultMessage: 'Delete review',
  },
  deleteConfirmTitle: {
    id: 'ReviewDetails.deleteConfirmTitle',
    defaultMessage: 'Delete this review?',
  },
  deleteConfirmBody: {
    id: 'ReviewDetails.deleteConfirmBody',
    defaultMessage:
      'The review is removed permanently and the product rating is recalculated. This cannot be undone.',
  },
  deleted: {
    id: 'ReviewDetails.deleted',
    defaultMessage: 'The review has been deleted.',
  },
  ratingMissing: {
    id: 'ReviewDetails.ratingMissing',
    defaultMessage: 'Choose a rating.',
  },
  customer: {
    id: 'ReviewDetails.customer',
    defaultMessage: 'Customer ID: {id}',
  },
  guest: {
    id: 'ReviewDetails.guest',
    defaultMessage: 'Written without a customer account',
  },
});
