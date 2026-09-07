import { RangeFilter } from "@/lib/launchpad/shared/query/RangeFilter";
import { TermFilter } from "@/lib/launchpad/shared/query/TermFilter";

export enum FilterTypes {
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  RANGE = 'range',
  TERM = 'term',
  MONEY = 'money',
  NUMBER = 'number',
  TEXT = 'text',
}

export interface BaseFilter {
  identifier: string;
  type: FilterTypes;
}
export type Filter = RangeFilter | TermFilter;
