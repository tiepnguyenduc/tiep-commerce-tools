"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import type { HeaderCategory } from "@/lib/types";
import styles from "./HeaderCategoryNavigation.module.css";

export function HeaderCategoryNavigation({ categories }: { categories: HeaderCategory[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const roots = categories.filter(
    (category) => !category.parentId || !categories.some((parent) => parent.id === category.parentId),
  );
  const childrenOf = (parentId: string) => categories.filter((category) => category.parentId === parentId);
  const href = (category: HeaderCategory) =>
    `/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`;

  function cancelClose() {
    if (timer.current) clearTimeout(timer.current);
  }

  function closeSoon() {
    cancelClose();
    timer.current = setTimeout(() => setOpen(null), 180);
  }

  function focusPanel(categoryId: string) {
    cancelClose();
    setOpen(categoryId);
    requestAnimationFrame(() => {
      document.getElementById(`${id}-${categoryId}`)?.querySelector<HTMLAnchorElement>("a")?.focus();
    });
  }

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function descendants(parentId: string, visited: Set<string>): ReactNode {
    if (visited.has(parentId)) return null;
    const children = childrenOf(parentId);
    if (!children.length) return null;

    return (
      <ul>
        {children.map((child) => (
          <li key={child.id}>
            <Link href={href(child)}>{child.name}</Link>
            {descendants(child.id, new Set(visited).add(parentId))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav
      ref={ref}
      className={styles.nav}
      aria-label="Product categories"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          cancelClose();
          setOpen(null);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          cancelClose();
          ref.current?.querySelector<HTMLButtonElement>(`[data-category-toggle="${open}"]`)?.focus();
          setOpen(null);
        }
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) {
          cancelClose();
          setOpen(null);
        }
      }}
    >
      {roots.map((category) => {
        const children = childrenOf(category.id);
        const expanded = open === category.id;

        return (
          <div
            key={category.id}
            className={styles.item}
            data-open={expanded || undefined}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse" && window.matchMedia("(min-width: 1001px)").matches) {
                cancelClose();
                setOpen(children.length ? category.id : null);
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) {
                closeSoon();
              }
            }}
          >
            <div className={styles.trigger}>
              <Link
                href={href(category)}
                className={styles.label}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && children.length) {
                    event.preventDefault();
                    focusPanel(category.id);
                  }
                }}
              >
                {category.name}
              </Link>
              {children.length > 0 && (
                <button
                  type="button"
                  data-category-toggle={category.id}
                  className={styles.toggle}
                  aria-label={`Show ${category.name} subcategories`}
                  aria-expanded={expanded}
                  aria-controls={`${id}-${category.id}`}
                  onClick={() => {
                    cancelClose();
                    setOpen(expanded ? null : category.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusPanel(category.id);
                    }
                  }}
                >
                  <ChevronDownIcon aria-hidden="true" />
                </button>
              )}
            </div>
            {children.length > 0 && (
              <div id={`${id}-${category.id}`} className={styles.panel} hidden={!expanded}>
                <div className={styles.intro}>
                  <span className={styles.eyebrow}>Explore the collection</span>
                  <h2>{category.name}</h2>
                  <p>Considered pieces for the spaces you call home.</p>
                  <Link className={styles.shopAll} href={href(category)}>
                    Shop all {category.name}
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </div>
                <div className={styles.collections}>
                  <span className={styles.eyebrow}>Shop by category</span>
                  <div className={styles.groups}>
                    {children.map((child) => (
                      <section className={styles.group} key={child.id}>
                        <Link className={styles.groupTitle} href={href(child)}>
                          {child.name}
                          <ArrowRightIcon aria-hidden="true" />
                        </Link>
                        {descendants(child.id, new Set([category.id]))}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
