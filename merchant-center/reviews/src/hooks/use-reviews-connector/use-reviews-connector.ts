/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import {
  useMcQuery,
  useMcMutation,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import type { TDataTableSortingState } from '@commercetools-uikit/hooks';
import {
  MODERATION_STATE_KEYS,
  type TModerationDecision,
} from '../../constants';
import { extractErrorFromGraphQlResponse } from '../../helpers';
import type { TFormValues, TReview, TReviewFilters } from '../../types';
import type {
  TDeleteReviewMutation,
  TDeleteReviewMutationVariables,
  TFetchReviewDetailsQuery,
  TFetchReviewDetailsQueryVariables,
  TFetchReviewsQuery,
  TFetchReviewsQueryVariables,
  TReviewUpdateAction,
  TUpdateReviewMutation,
  TUpdateReviewMutationVariables,
} from '../../types/generated/ctp';
import DeleteReviewMutation from './delete-review.ctp.graphql';
import FetchReviewDetailsQuery from './fetch-review-details.ctp.graphql';
import FetchReviewsQuery from './fetch-reviews.ctp.graphql';
import UpdateReviewMutation from './update-review.ctp.graphql';

const platformContext = {
  target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
};

/** Translates the list filters into a commercetools query predicate. */
export const buildReviewsWhere = ({ visibility, rating }: TReviewFilters) => {
  const predicates: string[] = [];
  if (visibility !== 'all') {
    predicates.push(`includedInStatistics = ${visibility === 'visible'}`);
  }
  if (rating) {
    predicates.push(`rating = ${Number(rating)}`);
  }
  return predicates.length > 0 ? predicates.join(' and ') : undefined;
};

const emptyToNull = (value: string) => (value.trim() === '' ? null : value);

/** Update actions for the fields that changed between the review and the form. */
export const buildReviewUpdateActions = (
  review: TReview,
  values: TFormValues
): TReviewUpdateAction[] => {
  const actions: TReviewUpdateAction[] = [];
  const authorName = emptyToNull(values.authorName);
  const title = emptyToNull(values.title);
  const text = emptyToNull(values.text);
  const rating = values.rating === '' ? null : Number(values.rating);

  if (authorName !== (review.authorName ?? null)) {
    actions.push({ setAuthorName: { authorName } });
  }
  if (title !== (review.title ?? null)) {
    actions.push({ setTitle: { title } });
  }
  if (text !== (review.text ?? null)) {
    actions.push({ setText: { text } });
  }
  if (rating !== (review.rating ?? null)) {
    actions.push({ setRating: { rating } });
  }
  return actions;
};

type TUseReviewsFetcher = (props: {
  page: { value: number };
  perPage: { value: number };
  tableSorting: TDataTableSortingState;
  filters: TReviewFilters;
}) => {
  reviewsPaginatedResult?: TFetchReviewsQuery['reviews'];
  error?: ApolloError;
  loading: boolean;
};

export const useReviewsFetcher: TUseReviewsFetcher = ({
  page,
  perPage,
  tableSorting,
  filters,
}) => {
  const { data, error, loading } = useMcQuery<
    TFetchReviewsQuery,
    TFetchReviewsQueryVariables
  >(FetchReviewsQuery, {
    variables: {
      limit: perPage.value,
      offset: (page.value - 1) * perPage.value,
      // The id keeps pages stable for reviews written in the same instant.
      sort: [`${tableSorting.value.key} ${tableSorting.value.order}`, 'id asc'],
      where: buildReviewsWhere(filters),
    },
    context: platformContext,
    // Moderating a review in the modal changes the list it belongs to.
    fetchPolicy: 'cache-and-network',
  });

  return {
    reviewsPaginatedResult: data?.reviews,
    error,
    loading,
  };
};

type TUseReviewDetailsFetcher = (reviewId: string) => {
  review?: TFetchReviewDetailsQuery['review'];
  error?: ApolloError;
  loading: boolean;
};

export const useReviewDetailsFetcher: TUseReviewDetailsFetcher = (reviewId) => {
  const { data, error, loading } = useMcQuery<
    TFetchReviewDetailsQuery,
    TFetchReviewDetailsQueryVariables
  >(FetchReviewDetailsQuery, {
    variables: { reviewId },
    context: platformContext,
  });

  return {
    review: data?.review,
    error,
    loading,
  };
};

export const useReviewUpdater = () => {
  const [updateReview, { loading }] = useMcMutation<
    TUpdateReviewMutation,
    TUpdateReviewMutationVariables
  >(UpdateReviewMutation);

  const execute = async (review: TReview, actions: TReviewUpdateAction[]) => {
    try {
      return await updateReview({
        context: platformContext,
        variables: {
          reviewId: review.id,
          version: review.version,
          actions,
        },
        refetchQueries: ['FetchReviews'],
      });
    } catch (graphQlResponse) {
      throw extractErrorFromGraphQlResponse(graphQlResponse);
    }
  };

  return {
    loading,
    execute,
    /** Saves the edited fields. Resolves without a request when nothing changed. */
    save: (review: TReview, values: TFormValues) => {
      const actions = buildReviewUpdateActions(review, values);
      return actions.length > 0 ? execute(review, actions) : undefined;
    },
    /**
     * Moves the review to the approved or rejected State. `force` skips the
     * transition rules, so a merchant can change their mind in either direction.
     */
    moderate: (review: TReview, decision: TModerationDecision) =>
      execute(review, [
        {
          transitionState: {
            state: { typeId: 'state', key: MODERATION_STATE_KEYS[decision] },
            force: true,
          },
        },
      ]),
  };
};

export const useReviewDeleter = () => {
  const [deleteReview, { loading }] = useMcMutation<
    TDeleteReviewMutation,
    TDeleteReviewMutationVariables
  >(DeleteReviewMutation);

  const execute = async (review: Pick<TReview, 'id' | 'version'>) => {
    try {
      return await deleteReview({
        context: platformContext,
        variables: { reviewId: review.id, version: review.version },
        refetchQueries: ['FetchReviews'],
      });
    } catch (graphQlResponse) {
      throw extractErrorFromGraphQlResponse(graphQlResponse);
    }
  };

  return { loading, execute };
};
