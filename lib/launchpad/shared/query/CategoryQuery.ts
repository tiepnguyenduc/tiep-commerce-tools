import { PaginatedQuery } from '@/lib/launchpad/shared/query/PaginatedQuery';

export enum CategoryQueryFormat {
  FLAT = 'flat',
  TREE = 'tree'
}
export interface CategoryQuery extends PaginatedQuery {
  slug?: string;
  parentId?: string;
  format?: CategoryQueryFormat;
}
