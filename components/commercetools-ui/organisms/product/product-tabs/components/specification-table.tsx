"use client";
import { FC } from 'react';
import type { ProductSpecification } from '@/lib/types';

export interface SpecificationTableProps {
  specifications: ProductSpecification[];
}

/**
 * The "More Information" table: one label/value row per attribute. Laid out with
 * flex rather than `grid`, which the storefront also defines as a global class.
 */
const SpecificationTable: FC<SpecificationTableProps> = ({ specifications }) => {
  if (!specifications.length) {
    return <p className="text-14 text-gray-500">No specifications are published for this product yet.</p>;
  }

  return (
    <dl className="m-0 flex max-w-[860px] flex-col overflow-hidden rounded-lg border border-neutral-400">
      {specifications.map((specification, index) => (
        <div
          key={`${specification.label}-${specification.value}`}
          className={`flex flex-col gap-2 px-16 py-12 sm:grid sm:grid-cols-[minmax(160px,0.6fr)_minmax(0,1fr)] sm:gap-16 ${
            index % 2 ? 'bg-white' : 'bg-neutral-150'
          }`}
        >
          <dt className="text-14 font-medium text-gray-500">{specification.label}</dt>
          <dd className="m-0 text-14 text-gray-700 [overflow-wrap:anywhere]">{specification.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default SpecificationTable;
