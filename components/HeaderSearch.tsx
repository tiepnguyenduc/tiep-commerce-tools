"use client";

import styles from "./StorefrontCatalog.module.css";
import CTInput from "@/components/commercetools-ui/atoms/input";
import UIButton from "@/components/commercetools-ui/atoms/button";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faMagnifyingGlass,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { HeaderCategory, Product, SearchResult } from "@/lib/types";

const suggestionLimit = 5;

export function HeaderSearch({
  categories,
  products,
  inline = false,
}: {
  categories: HeaderCategory[];
  products: Product[];
  inline?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestedProducts, setSuggestedProducts] = useState(products);
  const [searchState, setSearchState] = useState<"ready" | "loading" | "error">(
    "ready",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();
  const categoryMatches = categories
    .filter((category) =>
      trimmedQuery
        ? category.name.toLowerCase().includes(trimmedQuery.toLowerCase())
        : true,
    )
    .slice(0, 4);
  const productsToShow = suggestedProducts.slice(0, suggestionLimit);

  useEffect(() => {
    if (pathname === "/search") {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      setSuggestedProducts(products);
      setSearchState("ready");
      return;
    }

    setSearchState("loading");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          perPage: String(suggestionLimit),
        });
        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search unavailable");
        const result = (await response.json()) as SearchResult;
        setSuggestedProducts(result.products);
        setSearchState("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestedProducts([]);
          setSearchState("error");
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [products, trimmedQuery]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("q");
    if (input instanceof HTMLInputElement) {
      input.value = input.value.trim();
    }
    setOpen(false);
  }

  function clearSearch() {
    setQuery("");
    setSuggestedProducts(products);
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div
      className={`header-search ${styles.headerSearch} ${open ? "open" : ""}`}
      ref={rootRef}
    >
      {!open && !inline ? (
        <UIButton
          variant="ghost"
          size="fit"
          aria-label="Open search"
          className="header-search-trigger"
          onClick={() => setOpen(true)}
          type="button"
        >
          <FontAwesomeIcon aria-hidden="true" icon={faMagnifyingGlass} />
        </UIButton>
      ) : (
        <>
          <form
            action="/search"
            className="header-search-form"
            method="get"
            onSubmit={submitSearch}
            role="search"
          >
            <label className="sr-only" htmlFor="header-search-input">
              Search products and categories
            </label>
            <CTInput
              containerClassName={styles.headerInput}
              className={styles.headerInputControl}
              autoComplete="off"
              id="header-search-input"
              name="q"
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              placeholder="Search products, categories..."
              ref={inputRef}
              type="search"
              value={query}
            />
            {query ? (
              <UIButton
                variant="ghost"
                size="fit"
                aria-label="Clear search"
                className={`header-search-clear ${styles.headerClear}`}
                onClick={clearSearch}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
              </UIButton>
            ) : null}
            <UIButton
              variant="ghost"
              size="fit"
              aria-label="Search"
              className={`header-search-submit ${styles.headerSubmit}`}
              type="submit"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faMagnifyingGlass} />
            </UIButton>
          </form>

          {open && (
            <div className="header-search-dropdown">
              <div className="header-search-group">
                <h3>Categories</h3>
                {categoryMatches.length ? (
                  categoryMatches.map((category) => (
                    <Link
                      className="header-search-row category-result"
                      href={`/search?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}${trimmedQuery ? `&q=${encodeURIComponent(trimmedQuery)}` : ""}`}
                      key={category.id}
                      onClick={() => setOpen(false)}
                    >
                      <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
                      <span>{category.name}</span>
                    </Link>
                  ))
                ) : (
                  <p className="search-empty">No matching categories</p>
                )}
              </div>

              <div className="header-search-group">
                <h3>Products</h3>
                {searchState !== "ready" ? (
                  <p className="search-empty" role="status">
                    {searchState === "loading"
                      ? "Finding products…"
                      : "Suggestions are unavailable. Try viewing all results."}
                  </p>
                ) : productsToShow.length ? (
                  productsToShow.map((product) => (
                    <Link
                      className="header-search-row product-result"
                      href={`/products/${product.slug}`}
                      key={product.id}
                      onClick={() => setOpen(false)}
                    >
                      <img src={product.image} alt="" />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.price.formatted}</small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="search-empty">No matching products</p>
                )}
              </div>

              <Link
                className="header-search-view-all"
                href={`/search${trimmedQuery ? `?q=${encodeURIComponent(trimmedQuery)}` : ""}`}
                onClick={() => setOpen(false)}
              >
                View all results{trimmedQuery ? ` for "${trimmedQuery}"` : ""}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
