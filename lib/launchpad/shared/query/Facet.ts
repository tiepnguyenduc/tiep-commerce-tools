import { FilterTypes } from '@/lib/launchpad/shared/query/Filter';

export interface Facet {
  type: FilterTypes.BOOLEAN | FilterTypes.ENUM | FilterTypes.RANGE | FilterTypes.TERM;
  identifier: string;
}
