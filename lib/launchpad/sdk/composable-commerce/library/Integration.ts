import { Integration, SDK } from '@commercetools/frontend-sdk';
import { getProjectActions, ProjectActions } from '@/lib/launchpad/sdk/composable-commerce/library/actions/ProjectActions';
import { getProductActions, ProductActions } from '@/lib/launchpad/sdk/composable-commerce/library/actions/ProductActions';
import { getCartActions, CartActions } from '@/lib/launchpad/sdk/composable-commerce/library/actions/CartActions';
import { getWishlistActions, WishlistActions } from '@/lib/launchpad/sdk/composable-commerce/library/actions/WishlistActions';
import { AccountActions, getAccountActions } from '@/lib/launchpad/sdk/composable-commerce/library/actions/AccountActions';
import { ComposableCommerceEvents } from '@/lib/launchpad/sdk/composable-commerce/types/events/ComposableCommerceEvents';

class ComposableCommerce extends Integration<ComposableCommerceEvents> {
  constructor(sdk: SDK<ComposableCommerceEvents>) {
    super(sdk);

    this.project = getProjectActions(sdk);
    this.product = getProductActions(sdk);
    this.cart = getCartActions(sdk);
    this.wishlist = getWishlistActions(sdk);
    this.account = getAccountActions(sdk);
  }

  unregisterExtension(): void {}

  project: ProjectActions;
  product: ProductActions;
  cart: CartActions;
  wishlist: WishlistActions;
  account: AccountActions;
}

export { ComposableCommerce };
