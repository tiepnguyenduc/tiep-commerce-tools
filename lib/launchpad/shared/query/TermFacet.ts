import { Facet } from '@/lib/launchpad/shared/query/Facet';
import { FilterTypes } from '@/lib/launchpad/shared/query/Filter';

export interface TermFacet extends Facet {
  type: FilterTypes.TERM | FilterTypes.BOOLEAN;
  terms?: string[];
}
