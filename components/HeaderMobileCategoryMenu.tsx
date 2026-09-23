"use client";

import Button from "@/components/commercetools-ui/atoms/button";
import Link from "@/components/commercetools-ui/atoms/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Category } from "@/lib/launchpad/types/entity/category";
import { useHeaderMobileMenu } from "./HeaderMobileMenu";
import styles from "./HeaderMobileCategoryMenu.module.css";

/**
 * Drill-down category navigation for the drawer: one level at a time keeps deep
 * catalogues thumb-friendly instead of stacking every subcategory in one scroll.
 */
export function HeaderMobileCategoryMenu({ categories }: { categories: Category[] }) {
  const [path, setPath] = useState<Category[]>([]);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const { isOpen, setDepth } = useHeaderMobileMenu();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams?.get("categoryId") ?? null;
  const headingRef = useRef<HTMLParagraphElement>(null);
  const navigated = useRef(false);

  const current = path[path.length - 1];
  const parent = path[path.length - 2];
  const level = current?.descendants ?? categories;

  // Reopening the drawer starts from the top level again.
  useEffect(() => {
    if (!isOpen) setPath([]);
  }, [isOpen]);

  useEffect(() => {
    setDepth(path.length);
  }, [path.length, setDepth]);

  // Moving between levels replaces the whole list, so send focus to its new heading.
  useEffect(() => {
    if (navigated.current) headingRef.current?.focus();
    navigated.current = false;
  }, [path.length]);

  function enter(category: Category) {
    navigated.current = true;
    setDirection("forward");
    setPath((entries) => [...entries, category]);
  }

  function back() {
    navigated.current = true;
    setDirection("back");
    setPath((entries) => entries.slice(0, -1));
  }

  return (
    <nav className={styles.menu} aria-label="Product categories">
      {/* Keyed so every level change replays the transition. */}
      <div className={styles.levelHeader} key={`head-${current?.categoryId ?? "root"}`} data-direction={direction}>
        {current && (
          <Button variant="ghost" size="fit" type="button" className={styles.back} onClick={back}>
            <span className={styles.row}>
              <ChevronLeftIcon aria-hidden="true" />
              {parent ? parent.name : "All categories"}
            </span>
          </Button>
        )}

        <p className={styles.heading} ref={headingRef} tabIndex={-1}>
          {current ? current.name : "Shop by category"}
        </p>

        {current && (
          <Link link={current._url} className={styles.viewAll}>
            View all {current.name}
          </Link>
        )}
      </div>

      <ul className={styles.list} key={current?.categoryId ?? "root"} data-direction={direction}>
        {level.map((category, index) => (
          // The stagger stops building up after a few rows so long levels still feel instant.
          <li key={category.categoryId} style={{ "--row": Math.min(index, 6) } as CSSProperties}>
            {category.descendants?.length ? (
              <Button
                variant="ghost"
                size="fit"
                type="button"
                className={styles.item}
                aria-label={`Show ${category.name} subcategories`}
                onClick={() => enter(category)}
              >
                <span className={styles.row}>
                  <span>{category.name}</span>
                  <ChevronRightIcon aria-hidden="true" />
                </span>
              </Button>
            ) : (
              <Link
                link={category._url}
                className={styles.item}
                data-active={category.categoryId === activeCategoryId || undefined}
                aria-current={category.categoryId === activeCategoryId ? "page" : undefined}
              >
                <span className={styles.row}>
                  <span>{category.name}</span>
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
