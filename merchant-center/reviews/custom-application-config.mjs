import { PERMISSIONS, entryPointUriPath } from './src/constants';

/**
 * Values come from `.env.local` (see `.env.example`), which `mc-scripts` loads
 * automatically, so the same file works for every project and environment.
 *
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Product Reviews',
  description:
    'Moderate, edit and delete product reviews written on the storefront.',
  entryPointUriPath,
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    development: {
      initialProjectKey: '${env:CTP_INITIAL_PROJECT_KEY}',
    },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  oAuthScopes: {
    // Reviews are covered by the product scopes. States hold the
    // "approved" / "rejected" moderation states.
    view: ['view_products', 'view_states'],
    manage: ['manage_products', 'manage_states'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/star.svg}',
  mainMenuLink: {
    defaultLabel: 'Product Reviews',
    labelAllLocales: [
      { locale: 'en', value: 'Product Reviews' },
      { locale: 'de', value: 'Produktbewertungen' },
    ],
    permissions: [PERMISSIONS.View],
  },
  submenuLinks: [],
};

export default config;
