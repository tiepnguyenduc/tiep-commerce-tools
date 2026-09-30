"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { createHoverIntent } from "@/lib/hover-intent";
import { MARKETS } from "@/lib/market-preference";
import { useMarketPreference } from "./useMarketPreference";
import styles from "./StorefrontAnnouncement.module.css";

const copy = {
  en: { announcement: "Explore this season’s", collection: "collection", country: "Country", language: "Language", label: "Country and language", retail: "Shop for your home", business: "Shop for your business", note: "Country and language preference. Prices and checkout currency are set by your store.", US: "United States", DE: "Germany", languageName: "English" },
  de: { announcement: "Entdecken Sie unsere aktuelle", collection: "Kollektion", country: "Land", language: "Sprache", label: "Land und Sprache", retail: "Für Ihr Zuhause", business: "Für Ihr Unternehmen", note: "Land- und Spracheinstellung. Preise und Zahlungswährung werden von Ihrem Store festgelegt.", US: "Vereinigte Staaten", DE: "Deutschland", languageName: "Deutsch" },
};

export function StorefrontAnnouncement({ business = false }: { business?: boolean }) {
  const [preference, setPreference] = useMarketPreference();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const intent = useRef(createHoverIntent());
  const focusOnOpen = useRef(false);
  const close = () => { intent.current.cancel(); setOpen(false); };
  useEffect(() => () => intent.current.cancel(), []);
  const text = copy[preference];
  const market = MARKETS.find((item) => item.key === preference)!;

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) panel.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    focusOnOpen.current = false;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { intent.current.cancel(); setOpen(false); }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); intent.current.cancel(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <div className={styles.bar} lang={preference}>
      <div className={styles.inner}>
        <Link className={styles.otherStore} href={business ? "/" : "/b2b"}>{business ? text.retail : text.business} <span aria-hidden="true">↗</span></Link>
        <Link className={styles.announcement} href={business ? "/b2b/products" : "/products"}>{text.announcement} <span>{text.collection}</span></Link>
        <div className={styles.selector} ref={root}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close(); }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              intent.current.open(() => { focusOnOpen.current = false; setOpen(true); });
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) intent.current.close(() => setOpen(false));
          }}>

          <button ref={trigger} className={styles.trigger} type="button" aria-label={`${text.label}: ${text[market.countryCode as "US" | "DE"]}, ${text.languageName}`} aria-expanded={open} aria-controls={id} onClick={() => { intent.current.cancel(); focusOnOpen.current = !open; setOpen((value) => !value); }}>
            <span className={styles.flag} aria-hidden="true">{market.flag}</span><span>{text.languageName}</span><ChevronDownIcon aria-hidden="true" data-open={open} />
          </button>
          {open && <div ref={panel} id={id} className={styles.panel} onPointerEnter={() => intent.current.cancel()} role="region" aria-label={text.label}>
            <fieldset><legend>{text.country}</legend>
              {MARKETS.map((option) => <label key={option.key} className={styles.option}>
                <input type="radio" name={`${id}-country`} value={option.countryCode} checked={option.key === preference} onChange={() => setPreference(option.key)} />
                <span className={styles.flag} aria-hidden="true">{option.flag}</span><span>{text[option.countryCode as "US" | "DE"]} ({option.currency})</span>
              </label>)}
            </fieldset>
            <fieldset><legend>{text.language}</legend><label className={styles.option}><input type="radio" name={`${id}-language`} checked readOnly value={preference} /><span>{text.languageName}</span></label></fieldset>
            <p className={styles.note}>{text.note}</p>
          </div>}
        </div>
      </div>
    </div>
  );
}
