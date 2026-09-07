import { Facet, FacetTypes } from '@/lib/launchpad/shared/result/Facet';

export interface RangeFacet extends Facet {
  type: FacetTypes.RANGE;
  min?: number;
  max?: number;
  minSelected?: number;
  maxSelected?: number;
}
