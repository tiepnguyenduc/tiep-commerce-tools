import { BaseFilter, FilterTypes } from '@/lib/launchpad/shared/query/Filter';

export interface RangeFilter extends BaseFilter {
  type: FilterTypes.RANGE;
  min?: number;
  max?: number;
}
