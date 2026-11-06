import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { SuspendedRoute } from '@commercetools-frontend/application-shell';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import { NO_VALUE_FALLBACK } from '@commercetools-frontend/constants';
import { formatLocalizedString } from '@commercetools-frontend/l10n';
import DataTable from '@commercetools-uikit/data-table';
import {
  usePaginationState,
  useDataTableSortingState,
} from '@commercetools-uikit/hooks';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { ContentNotification } from '@commercetools-uikit/notifications';
import { Pagination } from '@commercetools-uikit/pagination';
import SelectInput from '@commercetools-uikit/select-input';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import { RATINGS } from '../../constants';
import { getErrorMessage, getTargetProductName } from '../../helpers';
import { useReviewsFetcher } from '../../hooks/use-reviews-connector';
import type {
  TReviewFilters,
  TReviewRow,
  TVisibilityFilter,
} from '../../types';
import ReviewDetails from '../review-details';
import ReviewStatus, { RatingStars } from '../review-status';
import messages from './messages';
import ModerationSetup from './moderation-setup';

const INITIAL_FILTERS: TReviewFilters = { visibility: 'all', rating: '' };

const Reviews = () => {
  const intl = useIntl();
  const match = useRouteMatch();
  const { push } = useHistory();
  const { page, perPage } = usePaginationState();
  const tableSorting = useDataTableSortingState({
    key: 'createdAt',
    order: 'desc',
  });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const { dataLocale, projectLanguages } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale,
    projectLanguages: context.project?.languages,
  }));
  const { reviewsPaginatedResult, error, loading } = useReviewsFetcher({
    page,
    perPage,
    tableSorting,
    filters,
  });

  const changeFilter = (next: Partial<TReviewFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    page.onChange(1);
  };

  const columns = [
    { key: 'product', label: intl.formatMessage(messages.columnProduct) },
    {
      key: 'rating',
      label: intl.formatMessage(messages.columnRating),
      isSortable: true,
    },
    { key: 'title', label: intl.formatMessage(messages.columnTitle) },
    { key: 'authorName', label: intl.formatMessage(messages.columnAuthor) },
    { key: 'status', label: intl.formatMessage(messages.columnStatus) },
    {
      key: 'createdAt',
      label: intl.formatMessage(messages.columnCreatedAt),
      isSortable: true,
    },
  ];

  const renderProduct = (review: TReviewRow) => {
    const name = getTargetProductName(review.target);
    if (!name) {
      return intl.formatMessage(messages.unknownTarget, {
        id: review.target?.id ?? NO_VALUE_FALLBACK,
      });
    }
    return formatLocalizedString(
      { name },
      {
        key: 'name',
        locale: dataLocale,
        fallbackOrder: projectLanguages,
        fallback: NO_VALUE_FALLBACK,
      }
    );
  };

  return (
    <Spacings.Stack scale="xl">
      <Spacings.Stack scale="xs">
        <Text.Headline as="h2" intlMessage={messages.title} />
        <Text.Detail tone="secondary" intlMessage={messages.subtitle} />
      </Spacings.Stack>

      <ModerationSetup />

      <Spacings.Inline scale="m" alignItems="center">
        <SelectInput
          name="visibility"
          aria-label={intl.formatMessage(messages.filterVisibility)}
          horizontalConstraint={6}
          value={filters.visibility}
          onChange={(event) =>
            changeFilter({
              visibility: event.target.value as TVisibilityFilter,
            })
          }
          options={[
            {
              value: 'all',
              label: intl.formatMessage(messages.visibilityAll),
            },
            {
              value: 'visible',
              label: intl.formatMessage(messages.visibilityVisible),
            },
            {
              value: 'hidden',
              label: intl.formatMessage(messages.visibilityHidden),
            },
          ]}
        />
        <SelectInput
          name="rating"
          aria-label={intl.formatMessage(messages.filterRating)}
          horizontalConstraint={5}
          value={filters.rating}
          onChange={(event) =>
            changeFilter({ rating: (event.target.value as string) ?? '' })
          }
          options={[
            { value: '', label: intl.formatMessage(messages.ratingAll) },
            ...[...RATINGS].reverse().map((rating) => ({
              value: String(rating),
              label: intl.formatMessage(messages.ratingOption, { rating }),
            })),
          ]}
        />
        {reviewsPaginatedResult && (
          <Text.Detail tone="secondary">
            {intl.formatMessage(messages.results, {
              total: reviewsPaginatedResult.total,
            })}
          </Text.Detail>
        )}
      </Spacings.Inline>

      {error && (
        <ContentNotification type="error">
          <Text.Body>{getErrorMessage(error)}</Text.Body>
        </ContentNotification>
      )}

      {loading && !reviewsPaginatedResult && <LoadingSpinner />}

      {reviewsPaginatedResult ? (
        <Spacings.Stack scale="l">
          {reviewsPaginatedResult.results.length === 0 ? (
            <Text.Body intlMessage={messages.noResults} />
          ) : (
            <DataTable<TReviewRow>
              isCondensed
              columns={columns}
              rows={reviewsPaginatedResult.results}
              itemRenderer={(item, column) => {
                switch (column.key) {
                  case 'product':
                    return renderProduct(item);
                  case 'rating':
                    return <RatingStars rating={item.rating} />;
                  case 'title':
                    return item.title || NO_VALUE_FALLBACK;
                  case 'authorName':
                    return item.authorName || NO_VALUE_FALLBACK;
                  case 'status':
                    return <ReviewStatus review={item} />;
                  case 'createdAt':
                    return intl.formatDate(item.createdAt, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });
                  default:
                    return null;
                }
              }}
              sortedBy={tableSorting.value.key}
              sortDirection={tableSorting.value.order}
              onSortChange={tableSorting.onChange}
              onRowClick={(row) => push(`${match.url}/${row.id}`)}
            />
          )}
          <Pagination
            page={page.value}
            onPageChange={page.onChange}
            perPage={perPage.value}
            onPerPageChange={perPage.onChange}
            totalItems={reviewsPaginatedResult.total}
            perPageRange="s"
          />
        </Spacings.Stack>
      ) : null}

      <Switch>
        <SuspendedRoute path={`${match.path}/:id`}>
          <ReviewDetails onClose={() => push(match.url)} />
        </SuspendedRoute>
      </Switch>
    </Spacings.Stack>
  );
};
Reviews.displayName = 'Reviews';

export default Reviews;
