import { graphql } from 'msw';
import { setupServer } from 'msw/node';
import {
  fireEvent,
  screen,
  mapResourceAccessToAppliedPermissions,
  waitFor,
  type TRenderAppWithReduxOptions,
} from '@commercetools-frontend/application-shell/test-utils';
import {
  entryPointUriPath,
  MODERATION_STATE_KEYS,
  PERMISSIONS,
} from '../../constants';
import ApplicationRoutes from '../../routes';
import { renderApplicationWithRedux } from '../../test-utils';
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

const renderApp = (
  options: Partial<TRenderAppWithReduxOptions> = {},
  includeManagePermissions = true
) => {
  const { history } = renderApplicationWithRedux(<ApplicationRoutes />, {
    route: `/my-project/${entryPointUriPath}`,
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

const moderationStatesHandler = (keys?: string[]) =>
  graphql.query('FetchModerationStates', (_req, res, ctx) =>
    res(ctx.data({ states: buildModerationStates(keys) }))
  );

it('should list reviews with their product and storefront status', async () => {
  mockServer.use(
    moderationStatesHandler(),
    graphql.query('FetchReviews', (_req, res, ctx) =>
      res(
        ctx.data({
          reviews: buildReviewList([
            buildReview({ id: 'r1', title: 'Love it' }),
            buildReview({
              id: 'r2',
              title: 'Broke after a week',
              productName: 'Oak Table',
              includedInStatistics: false,
              stateKey: MODERATION_STATE_KEYS.rejected,
            }),
            buildReview({
              id: 'r3',
              title: 'Solid',
              stateKey: MODERATION_STATE_KEYS.approved,
            }),
          ]),
        })
      )
    )
  );
  renderApp();

  await screen.findByText('Love it');
  expect(screen.getByText('Oak Table')).toBeInTheDocument();
  expect(screen.getByText('Published, not moderated')).toBeInTheDocument();
  expect(screen.getByText('Hidden')).toBeInTheDocument();
  expect(screen.getByText('Approved')).toBeInTheDocument();
  expect(screen.getByText('3 reviews')).toBeInTheDocument();
  // The moderation states exist, so no set-up is offered.
  expect(
    screen.queryByRole('button', { name: 'Create moderation states' })
  ).not.toBeInTheDocument();
});

it('should query only hidden reviews when filtering by visibility', async () => {
  const requestedWhere: Array<string | undefined> = [];
  mockServer.use(
    moderationStatesHandler(),
    graphql.query('FetchReviews', (req, res, ctx) => {
      requestedWhere.push(req.variables.where);
      return res(ctx.data({ reviews: buildReviewList([]) }));
    })
  );
  renderApp();

  await screen.findByText('No reviews match these filters.');
  fireEvent.focus(screen.getByLabelText('Visibility'));
  fireEvent.keyDown(screen.getByLabelText('Visibility'), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByText('Hidden'));

  await waitFor(() =>
    expect(requestedWhere).toContain('includedInStatistics = false')
  );
});

it('should create the missing moderation states', async () => {
  const createdKeys: string[] = [];
  mockServer.use(
    moderationStatesHandler(createdKeys),
    graphql.query('FetchReviews', (_req, res, ctx) =>
      res(ctx.data({ reviews: buildReviewList([]) }))
    ),
    graphql.mutation('CreateModerationState', (req, res, ctx) => {
      createdKeys.push(req.variables.draft.key);
      return res(
        ctx.data({
          createState: {
            __typename: 'State',
            id: `state-${req.variables.draft.key}`,
            key: req.variables.draft.key,
            roles: req.variables.draft.roles,
          },
        })
      );
    })
  );
  renderApp();

  fireEvent.click(
    await screen.findByRole('button', { name: 'Create moderation states' })
  );

  await screen.findByText('Moderation states created.');
  expect(createdKeys).toEqual([
    MODERATION_STATE_KEYS.approved,
    MODERATION_STATE_KEYS.rejected,
  ]);
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Create moderation states' })
    ).not.toBeInTheDocument()
  );
});

it('should not offer the moderation set-up without the manage permission', async () => {
  mockServer.use(
    moderationStatesHandler([]),
    graphql.query('FetchReviews', (_req, res, ctx) =>
      res(ctx.data({ reviews: buildReviewList([]) }))
    )
  );
  renderApp({}, false);

  await screen.findByText(/Ask a user with the Manage permission/);
  expect(
    screen.queryByRole('button', { name: 'Create moderation states' })
  ).not.toBeInTheDocument();
});
