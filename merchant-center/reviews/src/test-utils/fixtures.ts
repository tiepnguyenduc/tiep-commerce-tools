import { MODERATION_STATE_KEYS } from '../constants';

type TReviewFixture = {
  id: string;
  title?: string | null;
  text?: string | null;
  authorName?: string | null;
  rating?: number | null;
  includedInStatistics?: boolean;
  stateKey?: string | null;
  productName?: string;
};

export const buildReview = ({
  id,
  title = 'Great chair',
  text = 'Comfortable and sturdy.',
  authorName = 'Jane',
  rating = 4,
  includedInStatistics = true,
  stateKey = null,
  productName = 'Modern Chair',
}: TReviewFixture) => ({
  __typename: 'Review',
  id,
  version: 1,
  key: null,
  authorName,
  title,
  text,
  rating,
  locale: 'en-US',
  includedInStatistics,
  createdAt: '2026-10-01T10:00:00.000Z',
  lastModifiedAt: '2026-10-01T10:00:00.000Z',
  customerRef: null,
  state: stateKey
    ? { __typename: 'State', id: `state-${stateKey}`, key: stateKey }
    : null,
  target: {
    __typename: 'Product',
    id: `product-of-${id}`,
    key: null,
    masterData: {
      __typename: 'ProductCatalogData',
      current: {
        __typename: 'ProductData',
        nameAllLocales: [
          { __typename: 'LocalizedString', locale: 'en', value: productName },
        ],
      },
    },
  },
});

export const buildReviewList = (reviews: ReturnType<typeof buildReview>[]) => ({
  __typename: 'ReviewQueryResult',
  total: reviews.length,
  count: reviews.length,
  offset: 0,
  results: reviews,
});

export const buildModerationStates = (
  keys: string[] = Object.values(MODERATION_STATE_KEYS)
) => ({
  __typename: 'StateQueryResult',
  results: keys.map((key) => ({
    __typename: 'State',
    id: `state-${key}`,
    key,
    roles:
      key === MODERATION_STATE_KEYS.approved
        ? ['ReviewIncludedInStatistics']
        : [],
  })),
});
