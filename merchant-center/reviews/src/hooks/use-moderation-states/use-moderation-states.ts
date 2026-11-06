/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import type { ApolloError } from '@apollo/client';
import {
  useMcQuery,
  useMcMutation,
} from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import {
  MODERATION_STATE_KEYS,
  type TModerationDecision,
} from '../../constants';
import { extractErrorFromGraphQlResponse, quote } from '../../helpers';
import type {
  TCreateModerationStateMutation,
  TCreateModerationStateMutationVariables,
  TFetchModerationStatesQuery,
  TFetchModerationStatesQueryVariables,
  TStateDraft,
} from '../../types/generated/ctp';
import CreateModerationStateMutation from './create-moderation-state.ctp.graphql';
import FetchModerationStatesQuery from './fetch-moderation-states.ctp.graphql';

const platformContext = {
  target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
};

const MODERATION_STATE_DRAFTS: Record<TModerationDecision, TStateDraft> = {
  approved: {
    key: MODERATION_STATE_KEYS.approved,
    type: 'ReviewState',
    initial: false,
    roles: ['ReviewIncludedInStatistics'],
    name: [{ locale: 'en', value: 'Approved' }],
    description: [
      {
        locale: 'en',
        value: 'Checked by a merchant and shown on the storefront.',
      },
    ],
  },
  rejected: {
    key: MODERATION_STATE_KEYS.rejected,
    type: 'ReviewState',
    initial: false,
    roles: [],
    name: [{ locale: 'en', value: 'Rejected' }],
    description: [
      {
        locale: 'en',
        value:
          'Hidden from the storefront and excluded from the product rating.',
      },
    ],
  },
};

const DECISIONS = Object.keys(MODERATION_STATE_KEYS) as TModerationDecision[];

const where = `type = "ReviewState" and key in (${Object.values(
  MODERATION_STATE_KEYS
)
  .map(quote)
  .join(', ')})`;

type TUseModerationStates = () => {
  /** Whether both moderation states exist in the project. */
  isReady: boolean;
  loading: boolean;
  error?: ApolloError;
  isSettingUp: boolean;
  /** Creates the moderation states that are missing. */
  setUp: () => Promise<void>;
};

export const useModerationStates: TUseModerationStates = () => {
  const { data, error, loading, refetch } = useMcQuery<
    TFetchModerationStatesQuery,
    TFetchModerationStatesQueryVariables
  >(FetchModerationStatesQuery, {
    variables: { where },
    context: platformContext,
  });
  const [createState, { loading: isSettingUp }] = useMcMutation<
    TCreateModerationStateMutation,
    TCreateModerationStateMutationVariables
  >(CreateModerationStateMutation);

  const states: TFetchModerationStatesQuery['states']['results'] =
    data?.states.results ?? [];
  const existingKeys = new Set(states.map((state) => state.key));
  const missing = DECISIONS.filter(
    (decision) => !existingKeys.has(MODERATION_STATE_KEYS[decision])
  );

  const setUp = async () => {
    try {
      for (const decision of missing) {
        await createState({
          context: platformContext,
          variables: { draft: MODERATION_STATE_DRAFTS[decision] },
        });
      }
    } catch (graphQlResponse) {
      throw extractErrorFromGraphQlResponse(graphQlResponse);
    } finally {
      await refetch();
    }
  };

  return {
    isReady: Boolean(data) && missing.length === 0,
    loading,
    error,
    isSettingUp,
    setUp,
  };
};
