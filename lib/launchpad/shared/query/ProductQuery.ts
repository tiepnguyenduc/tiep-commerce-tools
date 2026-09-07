import { Filter } from '@/lib/launchpad/shared/query/Filter';
import { PaginatedQuery } from '@/lib/launchpad/shared/query/PaginatedQuery';
import { Facet } from '@/lib/launchpad/shared/query/Facet';

export enum SortOrder {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export interface SortAttributes {
  [key: string]: any;
}

export interface LocalizedString {
  [key: string]: string;
}

export interface ProductQuery extends PaginatedQuery {
  categories?: string[];
  productIds?: string[];
  productKeys?: string[];
  productRefs?: string[];
  productTypeId?: string;
  skus?: string[];
  query?: string;
  filters?: Filter[];
  facets?: Facet[];
  sortAttributes?: SortAttributes;
  productSelectionId?: string;
  accountGroupIds?: string[]
}
