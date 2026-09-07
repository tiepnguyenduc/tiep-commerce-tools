import { Facet } from '@/lib/launchpad/shared/query/Facet';
import { FilterTypes } from '@/lib/launchpad/shared/query/Filter';

export interface RangeFacet extends Facet {
  type: FilterTypes.RANGE;
  min?: number;
  max?: number;
}
