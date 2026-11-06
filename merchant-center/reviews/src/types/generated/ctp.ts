/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/**
 * A key-value pair representing the field name and value of one single custom field.
 *
 * The value of this custom field consists of escaped JSON based on the FieldDefinition of the Type.
 *
 * Examples for `value`:
 *
 * * FieldType `String`: `"\"This is a string\""`
 * * FieldType `DateTimeType`: `"\"2018-10-12T14:00:00.000Z\""`
 * * FieldType `Number`: `"4"`
 * * FieldType `Set` with an elementType of `String`: `"[\"This is a string\", \"This is another string\"]"`
 * * FieldType `Reference`: `"{\"id\", \"b911b62d-353a-4388-93ee-8d488d9af962\", \"typeId\", \"product\"}"`
 */
export type TCustomFieldInput = {
  name: string;
  /**
   * The value of this custom field consists of escaped JSON based on the FieldDefinition of the Type.
   *
   * Examples for `value`:
   *
   * * FieldType `String`: `"\"This is a string\""`
   * * FieldType `DateTimeType`: `"\"2018-10-12T14:00:00.000Z\""`
   * * FieldType `Number`: `"4"`
   * * FieldType `Set` with an elementType of `String`: `"[\"This is a string\", \"This is another string\"]"`
   * * FieldType `Reference`: `"{\"id\", \"b911b62d-353a-4388-93ee-8d488d9af962\", \"typeId\", \"product\"}"`
   */
  value: string;
};

export type TLocalizedStringItemInputType = {
  locale: string;
  value: string;
};

export type TReferenceInput = {
  id: string;
  typeId: string;
};

export type TResourceIdentifierInput = {
  id?: string | null | undefined;
  key?: string | null | undefined;
  typeId?: string | null | undefined;
};

export type TReviewUpdateAction = {
  setAuthorName?: TSetReviewAuthorName | null | undefined;
  setCustomField?: TSetReviewCustomField | null | undefined;
  setCustomType?: TSetReviewCustomType | null | undefined;
  setCustomer?: TSetReviewCustomer | null | undefined;
  setKey?: TSetReviewKey | null | undefined;
  setLocale?: TSetReviewLocale | null | undefined;
  setRating?: TSetReviewRating | null | undefined;
  setTarget?: TSetReviewTarget | null | undefined;
  setText?: TSetReviewText | null | undefined;
  setTitle?: TSetReviewTitle | null | undefined;
  transitionState?: TTransitionReviewState | null | undefined;
};

export type TSetReviewAuthorName = {
  authorName?: string | null | undefined;
};

export type TSetReviewCustomField = {
  name: string;
  value?: string | null | undefined;
};

export type TSetReviewCustomType = {
  fields?: Array<TCustomFieldInput> | null | undefined;
  type?: TResourceIdentifierInput | null | undefined;
  typeId?: string | null | undefined;
  typeKey?: string | null | undefined;
};

export type TSetReviewCustomer = {
  customer?: TResourceIdentifierInput | null | undefined;
};

export type TSetReviewKey = {
  key?: string | null | undefined;
};

export type TSetReviewLocale = {
  locale?: string | null | undefined;
};

export type TSetReviewRating = {
  rating?: number | null | undefined;
};

export type TSetReviewTarget = {
  target?: TTargetReferenceInput | null | undefined;
};

export type TSetReviewText = {
  text?: string | null | undefined;
};

export type TSetReviewTitle = {
  title?: string | null | undefined;
};

export type TStateDraft = {
  description?: Array<TLocalizedStringItemInputType> | null | undefined;
  initial?: boolean | null | undefined;
  key: string;
  name?: Array<TLocalizedStringItemInputType> | null | undefined;
  roles?: Array<TStateRole> | null | undefined;
  transitions?: Array<TReferenceInput> | null | undefined;
  type: TStateType;
};

export type TStateRole = 'Return' | 'ReviewIncludedInStatistics';

export type TStateType =
  | 'LineItemState'
  | 'OrderState'
  | 'PaymentState'
  | 'ProductState'
  | 'ReviewState';

export type TTargetReferenceInput = {
  id?: string | null | undefined;
  key?: string | null | undefined;
  typeId: string;
};

export type TTransitionReviewState = {
  force?: boolean | null | undefined;
  state: TResourceIdentifierInput;
};

export type TCreateModerationStateMutationVariables = Exact<{
  draft: TStateDraft;
}>;

export type TCreateModerationStateMutation = {
  createState: {
    id: string;
    key: string | null;
    roles: Array<TStateRole>;
  } | null;
};

export type TFetchModerationStatesQueryVariables = Exact<{
  where: string;
}>;

export type TFetchModerationStatesQuery = {
  states: {
    results: Array<{
      id: string;
      key: string | null;
      roles: Array<TStateRole>;
    }>;
  };
};

export type TDeleteReviewMutationVariables = Exact<{
  reviewId: string;
  version: number;
}>;

export type TDeleteReviewMutation = { deleteReview: { id: string } | null };

export type TFetchReviewDetailsQueryVariables = Exact<{
  reviewId: string;
}>;

export type TFetchReviewDetailsQuery = {
  review: {
    id: string;
    version: number;
    key: string | null;
    authorName: string | null;
    title: string | null;
    text: string | null;
    rating: number | null;
    locale: string | null;
    includedInStatistics: boolean;
    createdAt: string;
    lastModifiedAt: string;
    customerRef: { id: string } | null;
    state: { id: string; key: string | null } | null;
    target:
      | { id: string }
      | {
          key: string | null;
          id: string;
          masterData: {
            current: {
              nameAllLocales: Array<{ locale: string; value: string }>;
            } | null;
          };
        }
      | null;
  } | null;
};

export type TFetchReviewsQueryVariables = Exact<{
  limit: number;
  offset: number;
  sort?: Array<string> | string | null | undefined;
  where?: string | null | undefined;
}>;

export type TFetchReviewsQuery = {
  reviews: {
    total: number;
    count: number;
    offset: number;
    results: Array<{
      id: string;
      authorName: string | null;
      title: string | null;
      rating: number | null;
      includedInStatistics: boolean;
      createdAt: string;
      state: { id: string; key: string | null } | null;
      target:
        | { id: string }
        | {
            key: string | null;
            id: string;
            masterData: {
              current: {
                nameAllLocales: Array<{ locale: string; value: string }>;
              } | null;
            };
          }
        | null;
    }>;
  };
};

export type TReviewDetailsFragment = {
  id: string;
  version: number;
  key: string | null;
  authorName: string | null;
  title: string | null;
  text: string | null;
  rating: number | null;
  locale: string | null;
  includedInStatistics: boolean;
  createdAt: string;
  lastModifiedAt: string;
  customerRef: { id: string } | null;
  state: { id: string; key: string | null } | null;
  target:
    | { id: string }
    | {
        key: string | null;
        id: string;
        masterData: {
          current: {
            nameAllLocales: Array<{ locale: string; value: string }>;
          } | null;
        };
      }
    | null;
};

export type TUpdateReviewMutationVariables = Exact<{
  reviewId: string;
  version: number;
  actions: Array<TReviewUpdateAction> | TReviewUpdateAction;
}>;

export type TUpdateReviewMutation = {
  updateReview: {
    id: string;
    version: number;
    key: string | null;
    authorName: string | null;
    title: string | null;
    text: string | null;
    rating: number | null;
    locale: string | null;
    includedInStatistics: boolean;
    createdAt: string;
    lastModifiedAt: string;
    customerRef: { id: string } | null;
    state: { id: string; key: string | null } | null;
    target:
      | { id: string }
      | {
          key: string | null;
          id: string;
          masterData: {
            current: {
              nameAllLocales: Array<{ locale: string; value: string }>;
            } | null;
          };
        }
      | null;
  } | null;
};
