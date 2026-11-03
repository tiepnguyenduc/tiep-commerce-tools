"use client";

import Button from "@/components/commercetools-ui/atoms/button";
import Link from "@/components/commercetools-ui/atoms/link";
import { ArrowRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import useOnClickOutside from "@/lib/launchpad/helpers/hooks/useOnClickOutside/index";
import type { Category } from "@/lib/launchpad/types/entity/category";
import styles from "./HeaderCategoryNavigation.module.css";

/** Hovering a top level item opens it only when the pointer settles on it. */
const HOVER_INTENT_MS = 70;
/** Leaving the menu keeps it open briefly so a diagonal move to the panel is forgiving. */
const CLOSE_GRACE_MS = 200;
/** Deeper levels stay in the drawer navigation instead of stretching the flyout. */
const MAX_PANEL_DEPTH = 3;

type NavigationMenu = {
  id: string;
  name: string;
  href?: string;
  /** Categories rendered as columns of the flyout. */
  groups: Category[];
  /** Category the flyout introduces; the overflow menu has none. */
  intro?: Category;
};

/** Top level categories beyond the inline budget move into a single "More" flyout. */
function toNavigationMenus(
  categories: Category[],
  maxInlineItems: number,
): NavigationMenu[] {
  const inline =
    categories.length > maxInlineItems
      ? categories.slice(0, maxInlineItems)
      : categories;
  const overflow = categories.slice(inline.length);
  const menus = inline.map((category) => ({
    id: category.categoryId as string,
    name: category.name as string,
    href: category._url,
    groups: category.descendants ?? [],
    intro: category,
  }));

  return overflow.length
    ? [...menus, { id: "more-categories", name: "More", groups: overflow }]
    : menus;
}

/** Ids of the category currently listed plus its ancestors, so the whole path can be marked. */
function activeCategoryTrail(
  categories: Category[],
  activeCategoryId: string | null,
) {
  const trail = new Set<string>();
  if (!activeCategoryId) return trail;

  const walk = (branch: Category[], ancestors: string[]): boolean =>
    branch.some((category) => {
      const path = [...ancestors, category.categoryId as string];
      if (
        category.categoryId !== activeCategoryId &&
        !walk(category.descendants ?? [], path)
      )
        return false;
      for (const categoryId of path) trail.add(categoryId);
      return true;
    });

  walk(categories, []);
  return trail;
}

export function HeaderCategoryNavigation({
  categories,
  maxInlineItems = 7,
}: {
  categories: Category[];
  maxInlineItems?: number;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoverMenu, setHoverMenu] = useState<string | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [underline, setUnderline] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const contentRefs = useRef(new Map<string, HTMLDivElement>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useId();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams?.get("categoryId") ?? null;

  const menus = useMemo(
    () => toNavigationMenus(categories, maxInlineItems),
    [categories, maxInlineItems],
  );
  const trail = useMemo(
    () => activeCategoryTrail(categories, activeCategoryId),
    [categories, activeCategoryId],
  );

  const panelId = useCallback(
    (menuId: string) => `${instanceId}-${menuId}`,
    [instanceId],
  );

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpenMenu(null);
  }, [clearTimer]);

  const open = useCallback(
    (menuId: string) => {
      clearTimer();
      setOpenMenu(menuId);
    },
    [clearTimer],
  );

  // Switching between top level items feels broken with a delay, so only the first
  // flyout of a hover sequence waits for the pointer to settle.
  const openOnHover = useCallback(
    (menuId: string) => {
      clearTimer();
      if (openMenu) setOpenMenu(menuId);
      else
        timer.current = setTimeout(() => setOpenMenu(menuId), HOVER_INTENT_MS);
    },
    [clearTimer, openMenu],
  );

  const closeOnHoverOut = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setOpenMenu(null), CLOSE_GRACE_MS);
  }, [clearTimer]);

  const focusTrigger = useCallback(
    (menuId: string) =>
      navRef.current
        ?.querySelector<HTMLElement>(`[data-menu="${menuId}"] [data-nav-focus]`)
        ?.focus(),
    [],
  );

  const openAndFocusPanel = useCallback(
    (menuId: string) => {
      open(menuId);
      requestAnimationFrame(() => {
        document
          .getElementById(panelId(menuId))
          ?.querySelector<HTMLAnchorElement>("a")
          ?.focus();
      });
    },
    [open, panelId],
  );

  useOnClickOutside(navRef, close);
  useEffect(() => clearTimer, [clearTimer]);

  // Flyout panels are measured up front so opening one only animates a known height,
  // never a layout pass in the middle of the transition.
  useEffect(() => {
    const contents = [...contentRefs.current.entries()];
    if (!contents.length) return;

    const measure = () => {
      setHeights((current) => {
        let changed = false;
        const next = { ...current };
        for (const [menuId, element] of contents) {
          const height = element.offsetHeight;
          if (next[menuId] !== height) {
            next[menuId] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const [, element] of contents) observer.observe(element);
    return () => observer.disconnect();
  }, [menus]);

  // One underline slides between items instead of every item fading its own in.
  const underlinedMenu =
    openMenu ??
    hoverMenu ??
    menus.find((menu) => trail.has(menu.id))?.id ??
    null;
  useEffect(() => {
    const list = listRef.current;
    const item = underlinedMenu
      ? list?.querySelector<HTMLElement>(`[data-menu="${underlinedMenu}"]`)
      : null;
    if (!list || !item) return;

    const place = () => {
      const bounds = item.getBoundingClientRect();
      setUnderline({
        left: bounds.left - list.getBoundingClientRect().left,
        width: bounds.width,
      });
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [underlinedMenu]);

  function moveTrigger(current: HTMLElement, step: 1 | -1) {
    const triggers = [
      ...(navRef.current?.querySelectorAll<HTMLElement>("[data-nav-focus]") ??
        []),
    ];
    const next =
      triggers[
        (triggers.indexOf(current) + step + triggers.length) % triggers.length
      ];
    next?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const menuId = target.closest<HTMLElement>("[data-menu]")?.dataset.menu;
    const isTrigger = !!target.closest("[data-nav-trigger]");

    if (event.key === "Escape") {
      if (!openMenu) return;
      event.preventDefault();
      event.stopPropagation();
      focusTrigger(openMenu);
      close();
      return;
    }

    if (!menuId) return;

    if (
      event.key === "ArrowDown" &&
      isTrigger &&
      menus.some((menu) => menu.id === menuId && menu.groups.length)
    ) {
      event.preventDefault();
      openAndFocusPanel(menuId);
      return;
    }

    if (
      (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
      target.matches("[data-nav-focus]")
    ) {
      event.preventDefault();
      moveTrigger(target, event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function subcategories(category: Category, depth: number): ReactNode {
    const children = category.descendants ?? [];
    if (!children.length || depth >= MAX_PANEL_DEPTH) return null;

    return (
      <ul>
        {children.map((child) => (
          <li key={child.categoryId}>
            <Link
              link={child._url}
              className={
                trail.has(child.categoryId as string)
                  ? styles.current
                  : undefined
              }
              aria-current={
                child.categoryId === activeCategoryId ? "page" : undefined
              }
            >
              {child.name}
            </Link>
            {subcategories(child, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label="Product categories"
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) close();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        setHoverMenu(null);
        closeOnHoverOut();
      }}
    >
      <ul className={styles.list} ref={listRef}>
        {menus.map((menu) => {
          const expanded = openMenu === menu.id;
          const hasPanel = menu.groups.length > 0;

          return (
            <li
              key={menu.id}
              className={styles.item}
              data-menu={menu.id}
              data-open={expanded || undefined}
              data-active={trail.has(menu.id) || undefined}
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                setHoverMenu(menu.id);
                if (hasPanel) openOnHover(menu.id);
                else close();
              }}
            >
              <div className={styles.trigger}>
                {menu.href ? (
                  <Link
                    link={menu.href}
                    className={styles.label}
                    data-nav-trigger
                    data-nav-focus
                    aria-current={
                      menu.id === activeCategoryId ? "page" : undefined
                    }
                    onFocus={() => setHoverMenu(menu.id)}
                  >
                    <span className={styles.labelText}>{menu.name}</span>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    size="fit"
                    type="button"
                    className={styles.label}
                    data-nav-trigger
                    data-nav-focus
                    aria-expanded={expanded}
                    aria-controls={panelId(menu.id)}
                    onFocus={() => setHoverMenu(menu.id)}
                    onClick={() => (expanded ? close() : open(menu.id))}
                  >
                    <span className={styles.labelText}>{menu.name}</span>
                  </Button>
                )}
                {hasPanel && menu.href && (
                  <Button
                    variant="ghost"
                    size="fit"
                    type="button"
                    className={styles.toggle}
                    data-nav-trigger
                    aria-label={`${expanded ? "Hide" : "Show"} ${menu.name} subcategories`}
                    aria-expanded={expanded}
                    aria-controls={panelId(menu.id)}
                    onClick={() => (expanded ? close() : open(menu.id))}
                  >
                    <ChevronDownIcon aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
        <span
          className={styles.underline}
          aria-hidden="true"
          data-visible={underline && underlinedMenu ? true : undefined}
          style={
            underline
              ? {
                  transform: `translateX(${underline.left}px)`,
                  width: underline.width,
                }
              : undefined
          }
        />
      </ul>

      {/*
        All flyouts share one surface: its height morphs between categories and the
        panels cross-fade, so hovering along the bar never snaps the layout.
      */}
      <div
        className={styles.flyout}
        data-open={openMenu ? true : undefined}
        style={{ height: openMenu ? (heights[openMenu] ?? 0) : 0 }}
      >
        {menus
          .filter((menu) => menu.groups.length > 0)
          .map((menu) => (
            <div
              key={menu.id}
              id={panelId(menu.id)}
              className={styles.panel}
              data-wide={menu.intro ? undefined : true}
              data-active={openMenu === menu.id || undefined}
              // Kept mounted so the flyout can transition; inert takes the closed
              // panels out of the accessibility tree and the tab order.
              inert={openMenu !== menu.id}
              ref={(element) => {
                if (element) contentRefs.current.set(menu.id, element);
                else contentRefs.current.delete(menu.id);
              }}
            >
              {menu.intro && (
                <div className={styles.intro}>
                  <span className={styles.eyebrow}>Explore the collection</span>
                  <h2>{menu.intro.name}</h2>
                  <p>Considered pieces for the spaces you call home.</p>
                  <Link link={menu.intro._url} className={styles.shopAll}>
                    Shop all {menu.intro.name}
                    <ArrowRightIcon aria-hidden="true" />
                  </Link>
                </div>
              )}
              <div className={styles.collections}>
                <span className={styles.eyebrow}>Shop by category</span>
                <div className={styles.groups}>
                  {menu.groups.map((group) => (
                    <section className={styles.group} key={group.categoryId}>
                      <Link
                        link={group._url}
                        className={styles.groupTitle}
                        aria-current={
                          group.categoryId === activeCategoryId
                            ? "page"
                            : undefined
                        }
                      >
                        {group.name}
                        <ArrowRightIcon aria-hidden="true" />
                      </Link>
                      {subcategories(group, 1)}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </nav>
  );
}
