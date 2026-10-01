"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { createHoverIntent } from "@/lib/hover-intent";
import { useStorefrontLanguages } from "./useStorefrontLanguages";
import {
  languageDisplayName,
  languageShortCode,
} from "@/lib/storefront-languages";
import { translateBusiness } from "@/lib/b2b/translations";
import styles from "./StorefrontAnnouncement.module.css";

export function StorefrontAnnouncement({
  business = false,
}: {
  business?: boolean;
}) {
  const language = useStorefrontLanguages(business ? "b2b" : "b2c");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const intent = useRef(createHoverIntent());
  const focusOnOpen = useRef(false);
  const close = () => {
    intent.current.cancel();
    setOpen(false);
  };
  useEffect(() => () => intent.current.cancel(), []);
  const displayLocale = language.locale || "en";
  const t = (text: string) => translateBusiness(displayLocale, text);
  const activeLanguage = language.locale
    ? languageDisplayName(language.locale, displayLocale)
    : t("Language");

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current)
      panel.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    focusOnOpen.current = false;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        intent.current.cancel();
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        intent.current.cancel();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.bar} lang={displayLocale}>
      <div className={styles.inner}>
        <Link className={styles.otherStore} href={business ? "/" : "/b2b"}>
          {business ? t("Shop for your home") : t("Shop for your business")}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
        <Link
          className={styles.announcement}
          href={business ? "/b2b/products" : "/products"}
        >
          {t("Explore this season’s")} <span>{t("collection")}</span>
        </Link>
        <div
          className={styles.selector}
          ref={root}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node))
              close();
          }}
          onPointerEnter={(event) => {
            if (
              event.pointerType === "mouse" &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches
            ) {
              intent.current.open(() => {
                focusOnOpen.current = false;
                setOpen(true);
              });
            }
          }}
          onPointerLeave={(event) => {
            if (
              event.pointerType === "mouse" &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches
            )
              intent.current.close(() => setOpen(false));
          }}
        >
          <button
            ref={trigger}
            className={styles.trigger}
            type="button"
            aria-label={`${t("Language")}: ${activeLanguage}`}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => {
              intent.current.cancel();
              focusOnOpen.current = !open;
              setOpen((value) => !value);
            }}
          >
            <span className={styles.activeLanguage} title={activeLanguage}>
              {language.locale ? languageShortCode(language.locale) : "…"}
            </span>
            <ChevronDownIcon aria-hidden="true" data-open={open} />
          </button>
          {open && (
            <div
              ref={panel}
              id={id}
              className={styles.panel}
              onPointerEnter={() => intent.current.cancel()}
              role="region"
              aria-label={t("Language")}
            >
              <fieldset>
                <legend>{t("Language")}</legend>
                {language.loading && (
                  <p className={styles.languageStatus} role="status">
                    {t("Loading languages…")}
                  </p>
                )}
                {language.error && (
                  <div className={styles.languageStatus} role="status">
                    <p>{t("We couldn’t load the languages.")}</p>
                    <button
                      className={styles.retry}
                      type="button"
                      onClick={language.retry}
                    >
                      {t("Try again")}
                    </button>
                  </div>
                )}
                {!language.loading &&
                  !language.error &&
                  !language.languages.length && (
                    <p className={styles.languageStatus}>
                      {t("No languages available.")}
                    </p>
                  )}
                <div className={styles.languageOptions}>
                  {language.languages.map((locale) => (
                    <label key={locale} className={styles.option}>
                      <input
                        type="radio"
                        name={`${id}-language`}
                        value={locale}
                        checked={locale === language.locale}
                        onChange={() => {
                          language.select(locale);
                          close();
                          trigger.current?.focus();
                        }}
                      />
                      <span className={styles.languageText}>
                        <span>{languageShortCode(locale)}</span>
                        <small>
                          {languageDisplayName(locale, displayLocale)}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
