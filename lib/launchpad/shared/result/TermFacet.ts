import { Facet, FacetTypes } from '@/lib/launchpad/shared/result/Facet';
import { Term } from '@/lib/launchpad/shared/result/Term';

// TermFacets can be used for both, term and boolean facet.
export interface TermFacet extends Facet {
  type: FacetTypes.TERM | FacetTypes.BOOLEAN;
  terms?: Term[];
}
