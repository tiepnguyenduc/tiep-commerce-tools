import { defineMessages } from 'react-intl';

export default defineMessages({
  title: {
    id: 'Reviews.title',
    defaultMessage: 'Product reviews',
  },
  subtitle: {
    id: 'Reviews.subtitle',
    defaultMessage:
      'Reviews written on the storefront. Hidden reviews are removed from the product page and its average rating.',
  },
  columnProduct: {
    id: 'Reviews.columnProduct',
    defaultMessage: 'Product',
  },
  columnRating: {
    id: 'Reviews.columnRating',
    defaultMessage: 'Rating',
  },
  columnTitle: {
    id: 'Reviews.columnTitle',
    defaultMessage: 'Review',
  },
  columnAuthor: {
    id: 'Reviews.columnAuthor',
    defaultMessage: 'Author',
  },
  columnStatus: {
    id: 'Reviews.columnStatus',
    defaultMessage: 'Status',
  },
  columnCreatedAt: {
    id: 'Reviews.columnCreatedAt',
    defaultMessage: 'Written on',
  },
  filterVisibility: {
    id: 'Reviews.filterVisibility',
    defaultMessage: 'Visibility',
  },
  visibilityAll: {
    id: 'Reviews.visibilityAll',
    defaultMessage: 'All reviews',
  },
  visibilityVisible: {
    id: 'Reviews.visibilityVisible',
    defaultMessage: 'Shown on the storefront',
  },
  visibilityHidden: {
    id: 'Reviews.visibilityHidden',
    defaultMessage: 'Hidden',
  },
  filterRating: {
    id: 'Reviews.filterRating',
    defaultMessage: 'Rating',
  },
  ratingAll: {
    id: 'Reviews.ratingAll',
    defaultMessage: 'Any rating',
  },
  ratingOption: {
    id: 'Reviews.ratingOption',
    defaultMessage: '{rating, plural, one {# star} other {# stars}}',
  },
  results: {
    id: 'Reviews.results',
    defaultMessage: '{total, plural, one {# review} other {# reviews}}',
  },
  noResults: {
    id: 'Reviews.noResults',
    defaultMessage: 'No reviews match these filters.',
  },
  unknownTarget: {
    id: 'Reviews.unknownTarget',
    defaultMessage: 'Not a product ({id})',
  },
  setupTitle: {
    id: 'Reviews.setupTitle',
    defaultMessage:
      'Approving and hiding reviews needs two review States in this project: "{approved}" and "{rejected}".',
  },
  setupHint: {
    id: 'Reviews.setupHint',
    defaultMessage:
      'Ask a user with the Manage permission of this application to create them.',
  },
  setupButton: {
    id: 'Reviews.setupButton',
    defaultMessage: 'Create moderation states',
  },
  setupDone: {
    id: 'Reviews.setupDone',
    defaultMessage: 'Moderation states created.',
  },
});
