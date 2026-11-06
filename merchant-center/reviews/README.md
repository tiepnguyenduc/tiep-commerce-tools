# Product Reviews — Merchant Center Custom Application

Moderate the product reviews that shoppers write on the storefront
(`components/ProductReviews.tsx`, `lib/ct/reviews.ts`) directly in the
commercetools Merchant Center.

Scaffolded with `create-mc-app` (`starter-typescript` template, app-kit 27).

## Features

- Paginated list of every review in the project with product name, star rating,
  title, author, storefront status and date; sortable by rating and date.
- Filters: visibility (shown on the storefront / hidden) and star rating.
- Review modal: edit rating, title, text and author name; approve, hide or
  permanently delete the review.
- Users with only the **View** permission get a read-only app.

### How moderation works

The storefront only reads reviews with `includedInStatistics = true`. A review
is counted in the statistics unless its State lacks the
`ReviewIncludedInStatistics` role, so moderation uses two `ReviewState`s:

| State key         | Role                         | Storefront                         |
| ----------------- | ---------------------------- | ---------------------------------- |
| _(no state)_      | —                            | Shown ("Published, not moderated") |
| `review-approved` | `ReviewIncludedInStatistics` | Shown ("Approved")                 |
| `review-rejected` | —                            | Hidden, excluded from the rating   |

Neither state is `initial`, so new reviews keep appearing immediately, exactly
as before. The first time the app opens in a project without these states, a
user with the **Manage** permission clicks **Create moderation states** on the
list page. Transitions use `force: true`, so a review can move back and forth.

## Requirements

- Node.js `^22.23.4 || ^24.22.1` (see `.nvmrc`; `nvm use`)
- A Merchant Center account with access to the project

## Local development

```sh
cd merchant-center/reviews
nvm use
cp .env.example .env.local   # fill in CLOUD_IDENTIFIER and CTP_INITIAL_PROJECT_KEY
npm install
npm start                    # http://localhost:3001, log in with your Merchant Center account
```

Development runs against the real project through the Merchant Center API
proxy; your own Merchant Center permissions apply.

Other scripts:

| Script                   | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `npm test`               | Jest + MSW tests                                              |
| `npm run typecheck`      | TypeScript                                                    |
| `npm run lint`           | ESLint, including the GraphQL documents against the schema    |
| `npm run generate-types` | Regenerate `src/types/generated/ctp.ts` after editing GraphQL |
| `npm run extract-intl`   | Refresh `src/i18n/data/core.json` after editing messages      |
| `npm run build`          | Production build into `public/` (needs all four env values)   |
| `npm run start:prod:local` | Serve the production build locally                          |

## Configure and install in the Merchant Center

Follows [Configure and manage Custom Applications](https://docs.commercetools.com/merchant-center/custom-applications).

1. **Add the Custom Application** — profile icon → _Manage organizations &
   teams_ → your Organization → _Custom Applications_ tab → _Configure Custom
   Applications_ → _Add a Custom Application_. Use the values from
   `custom-application-config.mjs`:
   - Name: `Product Reviews`
   - Entry point URI path: `product-reviews`
   - Application URL: the URL where you will host the build (`APPLICATION_URL`)
   - OAuth scopes — View: `view_products`, `view_states`;
     Manage: `manage_products`, `manage_states`
   - Main menu link: `Product Reviews`, icon _star_, no submenu links
2. Copy the generated **Application ID** into `CUSTOM_APPLICATION_ID` in
   `.env.local`.
3. **Build and deploy** — `npm run build` writes a static site to `public/`.
   Host it on any of the
   [supported services](https://docs.commercetools.com/merchant-center-customizations/deployment)
   (Vercel, Netlify, Cloudflare Pages, commercetools Connect, …) at
   `APPLICATION_URL`, then set the same env values in that service.
4. **Move to Ready** — in the Custom Application configuration, change the
   state from _Draft_ to _Ready_.
5. **Install** — Organization → _Custom Applications_ → _Install a Custom
   Application_ → select _Product Reviews_ → choose the projects (the B2C and,
   if wanted, the B2B project).
6. **Assign Team permissions** — on the installed application, grant teams
   `View` (read-only) or `Manage` (edit, moderate, delete). The permission keys
   are `ViewProductReviews` and `ManageProductReviews`.
7. Open the project in the Merchant Center → **Product Reviews** in the main
   menu → click **Create moderation states** once per project.

When you change `oAuthScopes` in the config, update them in the Custom
Application configuration in the Merchant Center too.
