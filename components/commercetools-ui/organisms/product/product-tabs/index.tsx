"use client";
import { FC, KeyboardEvent, ReactNode, useCallback, useRef } from 'react';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames/index';
import { classnames } from '@/lib/launchpad/helpers/utils/classnames/index';

export interface ProductTab {
  id: string;
  label: string;
  /** Rendered as a chip next to the label, e.g. the review count. */
  count?: number;
  content: ReactNode;
}

export interface ProductTabsProps {
  tabs: ProductTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

const ProductTabs: FC<ProductTabsProps> = ({ tabs, activeId, onChange, className = '' }) => {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  // Roving focus: arrow keys move between tabs the way a tablist is expected to.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
      const current = tabs.findIndex((tab) => tab.id === active?.id);

      let next = -1;
      if (event.key in offsets) next = (current + offsets[event.key] + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next < 0) return;

      event.preventDefault();
      onChange(tabs[next].id);
      tabRefs.current[tabs[next].id]?.focus();
    },
    [active?.id, onChange, tabs],
  );

  const containerClassName = useClassNames(['ct-ui col-span-full min-w-0 scroll-mt-100', className]);

  if (!tabs.length || !active) return null;

  return (
    <div className={containerClassName} id="product-tabs">
      <div
        role="tablist"
        aria-label="Product information"
        onKeyDown={handleKeyDown}
        className="flex gap-4 overflow-x-auto border-0 border-b border-neutral-400 [scrollbar-width:none] md:gap-8 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active.id;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              type="button"
              role="tab"
              id={`product-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`product-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={classnames(
                'flex shrink-0 cursor-pointer items-center gap-8 whitespace-nowrap border-0 border-b-2 bg-transparent px-8 py-14 text-15 transition',
                'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-700 md:px-14 md:text-16',
                isActive
                  ? 'border-gray-700 font-semibold text-gray-700'
                  : 'border-transparent font-medium text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={classnames(
                    'rounded-full px-8 py-2 text-12 font-medium tabular-nums transition',
                    isActive ? 'bg-gray-700 text-white' : 'bg-neutral-300 text-gray-600',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`product-tabpanel-${active.id}`}
        aria-labelledby={`product-tab-${active.id}`}
        tabIndex={0}
        className="pt-24 focus-visible:outline-none"
      >
        {active.content}
      </div>
    </div>
  );
};

export default ProductTabs;
