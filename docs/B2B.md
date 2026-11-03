# B2B storefront

The storefront lives at `/b2b`, with account/company management at `/b2b/account`, product details at `/b2b/products/[id]` and a separate business bag. It uses the current configured commercetools project and its actual published catalog. It does not fabricate machinery products or contract prices.

## Configuration

For a separate B2B project, set all six server-only variables: `CTP_B2B_PROJECT_KEY`, `CTP_B2B_CLIENT_ID`, `CTP_B2B_CLIENT_SECRET`, `CTP_B2B_AUTH_URL`, `CTP_B2B_API_URL`, and `CTP_B2B_SCOPES`. B2C keeps using `CTP_*`. If any dedicated B2B field is set, incomplete configuration disables the B2B connection instead of borrowing B2C credentials. If all six are empty, the portal shares the main project for backwards compatibility. Restart the development server after changing credentials.

Also configure:

- `B2B_SESSION_SECRET`: a cryptographically random secret of at least 32 characters; required in production. Local development can derive the encryption key from the selected B2B API client secret.
- `CTP_B2B_ADMIN_ROLE_KEY=b2b-admin`
- `CTP_B2B_BUYER_ROLE_KEY=b2b-buyer`
- `CTP_B2B_COUNTRY=US` and `CTP_B2B_CURRENCY=USD`: the market used for both product price selection and carts.
- `CTP_B2B_ONBOARDING_STORE_KEYS`: optional comma-separated Store keys assigned to every self-registered company. Only merchant-approved, public onboarding price tiers belong here. Never put private buyer-specific Stores in this list. Without this variable, a merchant assigns Stores after company creation.

For a new empty project only, preview setup with `node --env-file=.env.local scripts/setup-b2b.mjs`. Review its output before explicitly running with `--apply`. This legacy setup script targets the main `CTP_*` project; do not run it against a separately configured B2B project. The setup creates roles, distribution channels and Stores; it does not publish products, set negotiated prices, create accounts, or create Business Units.

Product Search is preferred. If its index is unavailable (404 or SearchDeactivated), the portal loads up to 100 published candidate IDs and validates each through Get ProductProjection in Store; excluded/unpublished products are omitted, while permission and other API errors remain failures. Each buyer Store needs exactly one distribution channel and published product availability through its active Product Selections. Set prices for the SKU in the configured currency, channel and optional country/customer group. Both embedded and standalone selected prices are supported; standalone prices are recommended for negotiated B2B contracts. No selected channel price means “Price unavailable”, never a B2C fallback.

The API client requires the relevant project-scoped customer, Business Unit, associate-role, Store, product and cart read/manage scopes (`manage_business_units`, `manage_orders`, and corresponding read scopes for the client-credentials as-associate endpoints). Limit credentials to this application and verify permissions against the project configuration. The `b2b-admin` role needs `UpdateAssociates`, `CreateMyCarts`, `ViewMyCarts`, and `UpdateMyCarts`; buyer needs the three cart permissions. Assignment roles must be buyer-assignable. The application does not grant arbitrary Store access or let customers assign administrator roles to other accounts.

## Customer workflow

1. Register a business account or sign in with an existing customer account.
2. Existing active Business Unit memberships are loaded, including inherited memberships. The first eligible Store is selected when its pricing configuration is valid.
3. An account without a company can create a Company with itself as administrator. Merchant-configured onboarding Stores are attached server-side; the browser cannot choose arbitrary Stores in the creation request.
4. Company administrators can add an already registered customer's email to their Business Unit with the configured buyer role. No open join-by-company-key operation exists.
5. Choose an assigned Business Unit and Store. Product visibility and negotiated prices use that Store; changing context restores only an Active bag belonging to the same customer, BU, Store, country and currency.
6. Add variants to the business bag and update quantities.
7. Check out at `/b2b/checkout`: choose one of the company's delivery addresses, enter the purchase order number and place the order. The order is created as the associate in the selected Business Unit and Store. Orders that match an active Approval Rule wait for approval; the confirmation page links to the Approval Flow. Online payment is not part of the business checkout, and the B2C checkout must not receive a B2B session.

## Isolation and authorization

`workshop_b2b` is an AES-256-GCM authenticated encrypted, HTTP-only, SameSite=Lax cookie with an eight-hour expiry and Secure in production. The B2C global demo session is never read or written. POST requires the same Origin as the storefront and validates all inputs. Credentials are never stored in the cookie.

Business Unit membership and Store assignment are verified server-side on every contextual read/write. Associate mutations and carts use as-associate endpoints. Public browsing returns catalog previews with no prices; authenticated browsing without a Store likewise has no price context. Store product search filters by Store ID, and each projection uses the in-Store endpoint so Product Selections and variant selections are enforced. Catalog and cart checks share currency, country, distribution channel and customer group inputs.

The cookie is stateless. Logging out expires it in the current browser; use server-side revocation/session storage if administrative forced logout is required. Add deployment-level rate limiting for authentication/company onboarding before public production launch. The first catalog page currently loads up to 100 products; pagination and richer server-side search are future extensions. No production deployment or live resource creation is performed by unit tests.

## Verification

`npx vitest run tests/b2b.test.ts tests/b2b-route.test.ts` covers authentication boundaries, unit membership, allowed Store validation, channel ambiguity, encrypted cookie integrity/expiry, logout and absence of fallback pricing, authorized as-associate mutations, cart channel propagation, incompatible cart rejection, and same-origin request validation. `npm run typecheck` validates the application contract.

## Documentation read

- [Company-specific pricing](https://docs.commercetools.com/learning-model-b2b-commerce/configure-b2b-pricing/company-specific-pricing)
- [Associate Business Units](https://docs.commercetools.com/api/projects/associate-business-units)
- [Product Projections](https://docs.commercetools.com/api/projects/productProjections)
- [Product Search](https://docs.commercetools.com/api/projects/product-search)

These documents establish the Store → distribution channel → selected product price / cart line distribution channel relationship, and the need to enforce Store Product Selections separately from price projection.

## Verified demo project configuration

Merchant Center project `tiep-b2b-project` is hosted in `us-central1.gcp`. Its existing role keys are `admin`, `buyer`, and `approver`; configure the portal role variables as `admin` and `buyer`. No setup script is required to recreate these resources.

| Store key | Distribution channel key | Supply channel key |
| --- | --- | --- |
| default-store | default-channel | default-warehouse |
| us-large-customers | us-large-customers | us-warehouse |
| us-medium-customers | us-medium-customers | us-warehouse |
| de-fr-uk | de-fr-uk | eu-warehouse |
| spain | spain | eu-warehouse |

The portal derives these references from the selected Store and checks customer Business Unit membership. Legacy `CTP_B2B_ASSOCIATE_ID`, `CTP_B2B_BUSINESS_UNIT_KEY`, and channel context variables belong to the older checkout example, which uses the main project; leave them unset when connecting a separate B2B project. An Associate ID must be an actual Customer ID, never a project key. Current portal market configuration is global (`CTP_B2B_COUNTRY`, `CTP_B2B_CURRENCY`); selecting a Store outside the configured country is rejected.

The prepared application client uses `manage_customers`, `manage_business_units`, `manage_orders`, `view_products`, `view_categories`, `view_stores`, and `view_associate_roles`, each suffixed with `:tiep-b2b-project`. Its credentials must stay in the ignored `.env.local`, never in frontend variables or documentation.

### Project languages permission

The header loads configured languages from the B2B project through `/api/b2b/languages`. Its server API client requires `view_project_settings:<b2b-project-key>` in addition to its existing B2B scopes. For example, append `view_project_settings:your-b2b-project` to `CTP_B2B_SCOPES` without removing the existing customer, Business Unit, Store, product, and cart scopes. The API client itself must be authorized for this scope; changing the requested scope string alone does not grant permission. Restart the development server after updating the authorized credentials/configuration.

If this permission is missing, the language selector shows an unavailable state and retry action. It does not substitute B2C project languages or fabricated language options. The endpoint returns only the configured language codes, never the rest of the project configuration.
