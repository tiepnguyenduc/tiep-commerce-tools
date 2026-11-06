import { graphql } from 'msw';
import { setupServer } from 'msw/node';
import {
  fireEvent,
  mapResourceAccessToAppliedPermissions,
  screen,
  type TRenderAppWithReduxOptions,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import {
  entryPointUriPath,
  MODERATION_STATE_KEYS,
  PERMISSIONS,
} from '../../constants';
import { renderApplicationWithRoutesAndRedux } from '../../test-utils';
import {
  buildModerationStates,
  buildReview,
  buildReviewList,
} from '../../test-utils/fixtures';

const mockServer = setupServer();
afterEach(() => mockServer.resetHandlers());
beforeAll(() => {
  mockServer.listen({
    // for debugging reasons we force an error when the test fires a request with a query or mutation which is not mocked
    // more: https://mswjs.io/docs/api/setup-worker/start#onunhandledrequest
    onUnhandledRequest: 'error',
  });
});
afterAll(() => {
  mockServer.close();
});

const REVIEW_ID = 'review-1';

const renderApp = (
  options: Partial<TRenderAppWithReduxOptions> = {},
  includeManagePermissions = true
) => {
  const { history } = renderApplicationWithRoutesAndRedux({
    route: `/my-project/${entryPointUriPath}/${REVIEW_ID}`,
    project: {
      allAppliedPermissions: mapResourceAccessToAppliedPermissions(
        [
          PERMISSIONS.View,
          includeManagePermissions ? PERMISSIONS.Manage : '',
        ].filter(Boolean)
      ),
    },
    ...options,
  });
  return { history };
};

const baseHandlers = (review = buildReview({ id: REVIEW_ID })) => [
  graphql.query('FetchModerationStates', (_req, res, ctx) =>
    res(ctx.data({ states: buildModerationStates() }))
  ),
  graphql.query('FetchReviews', (_req, res, ctx) =>
    res(ctx.data({ reviews: buildReviewList([review]) }))
  ),
  graphql.query('FetchReviewDetails', (_req, res, ctx) =>
    res(ctx.data({ review }))
  ),
];

it('should save only the edited fields', async () => {
  const sentActions: unknown[] = [];
  mockServer.use(
    ...baseHandlers(),
    graphql.mutation('UpdateReview', (req, res, ctx) => {
      sentActions.push(...req.variables.actions);
      return res(
        ctx.data({
          updateReview: {
            ...buildReview({ id: REVIEW_ID, title: 'Great chair!' }),
            version: 2,
          },
        })
      );
    })
  );
  renderApp();

  const titleInput = await screen.findByLabelText(/Title/);
  expect(titleInput).toHaveValue('Great chair');
  fireEvent.change(titleInput, { target: { value: 'Great chair!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await screen.findByText('The review has been saved.');
  expect(sentActions).toEqual([{ setTitle: { title: 'Great chair!' } }]);
});

it('should hide a review from the storefront', async () => {
  const sentActions: unknown[] = [];
  mockServer.use(
    ...baseHandlers(),
    graphql.mutation('UpdateReview', (req, res, ctx) => {
      sentActions.push(...req.variables.actions);
      return res(
        ctx.data({
          updateReview: {
            ...buildReview({
              id: REVIEW_ID,
              includedInStatistics: false,
              stateKey: MODERATION_STATE_KEYS.rejected,
            }),
            version: 2,
          },
        })
      );
    })
  );
  renderApp();

  fireEvent.click(
    await screen.findByRole('button', { name: 'Hide from storefront' })
  );

  await screen.findByText('The review is hidden from the storefront.');
  expect(sentActions).toEqual([
    {
      transitionState: {
        state: { typeId: 'state', key: MODERATION_STATE_KEYS.rejected },
        force: true,
      },
    },
  ]);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Hide from storefront' })
    ).toBeDisabled()
  );
});

it('should delete a review after confirmation', async () => {
  let deletedId: string | undefined;
  mockServer.use(
    ...baseHandlers(),
    graphql.mutation('DeleteReview', (req, res, ctx) => {
      deletedId = req.variables.reviewId;
      return res(
        ctx.data({ deleteReview: { __typename: 'Review', id: REVIEW_ID } })
      );
    })
  );
  const { history } = renderApp();

  fireEvent.click(await screen.findByRole('button', { name: 'Delete review' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'Delete this review?',
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

  await screen.findByText('The review has been deleted.');
  expect(deletedId).toBe(REVIEW_ID);
  await waitFor(() =>
    expect(history.location.pathname).toBe(`/my-project/${entryPointUriPath}`)
  );
});

it('should be read-only without the manage permission', async () => {
  mockServer.use(...baseHandlers());
  renderApp({}, false);

  const titleInput = await screen.findByLabelText(/Title/);
  expect(titleInput).toHaveAttribute('readonly');
  expect(
    screen.getByRole('button', { name: 'Hide from storefront' })
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete review' })).toBeDisabled();
});
