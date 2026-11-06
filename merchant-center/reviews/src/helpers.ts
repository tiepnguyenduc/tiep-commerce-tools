import { isApolloError, ApolloError, type ServerError } from '@apollo/client';
import { transformLocalizedFieldToLocalizedString } from '@commercetools-frontend/l10n';
import type { TReviewTarget } from './types';

export const getErrorMessage = (error: ApolloError) =>
  error.graphQLErrors?.map((e) => e.message).join('\n') || error.message;

const isServerError = (
  error: ApolloError['networkError']
): error is ServerError => {
  return Boolean((error as ServerError)?.result);
};

export const extractErrorFromGraphQlResponse = (graphQlResponse: unknown) => {
  if (graphQlResponse instanceof Error && isApolloError(graphQlResponse)) {
    if (
      isServerError(graphQlResponse.networkError) &&
      typeof graphQlResponse.networkError?.result !== 'string' &&
      graphQlResponse.networkError?.result?.errors.length > 0
    ) {
      return graphQlResponse?.networkError?.result.errors;
    }

    if (graphQlResponse.graphQLErrors?.length > 0) {
      return graphQlResponse.graphQLErrors;
    }
  }

  return graphQlResponse;
};

/** The product name of a review target, keyed by locale, or `null` for non-product targets. */
export const getTargetProductName = (target: TReviewTarget | null) => {
  if (!target || !('masterData' in target)) return null;
  return transformLocalizedFieldToLocalizedString(
    target.masterData.current?.nameAllLocales ?? []
  );
};

/** Wraps a value in quotes for a commercetools query predicate. */
export const quote = (value: string) => JSON.stringify(value);
