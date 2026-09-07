import { BaseFilter, FilterTypes } from '@/lib/launchpad/shared/query/Filter';

export interface TermFilter extends BaseFilter {
  type: FilterTypes.ENUM | FilterTypes.TERM | FilterTypes.BOOLEAN;
  terms?: string[];
}
