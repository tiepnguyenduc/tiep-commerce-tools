import { Event, SDK, ServerOptions } from '@commercetools/frontend-sdk';
import {
  AddToWishlistPayload,
  RemoveFromWishlistPayload,
  UpdateWishlistItemPayload,
} from '@/lib/launchpad/sdk/composable-commerce/types/payloads/WishlistPayloads';
import {
  AddToWishlistAction,
  GetWishlistAction,
  RemoveFromWishlistAction,
  UpdateWishlistItemAction,
} from '@/lib/launchpad/sdk/composable-commerce/types/actions/WishlistActions';
import { Wishlist } from '@/lib/launchpad/shared/wishlist/index';
import { ComposableCommerceEvents } from '@/lib/launchpad/sdk/composable-commerce/types/events/ComposableCommerceEvents';

export type WishlistActions = {
  getWishlist: GetWishlistAction;
  addItem: AddToWishlistAction;
  removeItem: RemoveFromWishlistAction;
  updateItem: UpdateWishlistItemAction;
};

export const getWishlistActions = (sdk: SDK<ComposableCommerceEvents>): WishlistActions => {
  return {
    getWishlist: async (
      options: {
        parallel?: boolean;
        customHeaderValue?: string;
        serverOptions?: ServerOptions;
      } = {},
    ) => {
      const response = await sdk.callAction<Wishlist>({
        actionName: 'wishlist/getWishlist',
        parallel: options.parallel,
        customHeaderValue: options.customHeaderValue,
        serverOptions: options.serverOptions,
      });

      if (!response.isError) {
        sdk.trigger(
          new Event({
            eventName: 'wishlistFetched',
            data: {
              wishlist: response.data,
            },
          }),
        );
      }
      return response;
    },
    addItem: async (
      payload: AddToWishlistPayload,
      options: {
        parallel?: boolean;
        customHeaderValue?: string;
        serverOptions?: ServerOptions;
      } = {},
    ) => {
      const response = await sdk.callAction<Wishlist>({
        actionName: 'wishlist/addToWishlist',
        payload,
        parallel: options.parallel,
        customHeaderValue: options.customHeaderValue,
        serverOptions: options.serverOptions,
      });

      if (!response.isError) {
        const lineItem = response.data.lineItems?.find((lineItem) => lineItem.variant?.sku === payload.variant.sku);
        if (lineItem) {
          sdk.trigger(
            new Event({
              eventName: 'lineItemAddedToWishlist',
              data: {
                lineItem,
              },
            }),
          );
        }
      }
      return response;
    },
    removeItem: async (
      payload: RemoveFromWishlistPayload,
      options: {
        parallel?: boolean;
        customHeaderValue?: string;
        serverOptions?: ServerOptions;
      } = {},
    ) => {
      const response = await sdk.callAction<Wishlist>({
        actionName: 'wishlist/removeLineItem',
        payload,
        parallel: options.parallel,
        customHeaderValue: options.customHeaderValue,
        serverOptions: options.serverOptions,
      });

      if (!response.isError && !response.data.lineItems?.find((item) => item.lineItemId === payload.lineItem.id)) {
        sdk.trigger(
          new Event({
            eventName: 'lineItemRemovedFromWishlist',
            data: {
              lineItemId: payload.lineItem.id,
            },
          }),
        );
      }
      return response;
    },
    updateItem: async (
      payload: UpdateWishlistItemPayload,
      options: {
        parallel?: boolean;
        customHeaderValue?: string;
        serverOptions?: ServerOptions;
      } = {},
    ) => {
      const response = await sdk.callAction<Wishlist>({
        actionName: 'wishlist/updateLineItemCount',
        payload,
        parallel: options.parallel,
        customHeaderValue: options.customHeaderValue,
        serverOptions: options.serverOptions,
      });

      if (!response.isError) {
        const lineItem = response.data.lineItems?.find((item) => item.lineItemId === payload.lineItem.id);
        if (lineItem?.count === payload.count) {
          sdk.trigger(
            new Event({
              eventName: 'wishlistLineItemUpdated',
              data: {
                lineItem: lineItem,
              },
            }),
          );
        }
      }
      return response;
    },
  };
};
