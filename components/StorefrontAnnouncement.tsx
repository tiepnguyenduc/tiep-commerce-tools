"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { createHoverIntent } from "@/lib/hover-intent";
import { useStorefrontCountries } from "./useStorefrontCountries";
import { countryDisplayName, countryFlag } from "@/lib/storefront-countries";
import { useStorefrontLanguages } from "./useStorefrontLanguages";
import { languageDisplayName } from "@/lib/storefront-languages";
import styles from "./StorefrontAnnouncement.module.css";

const copy = {
  en: { announcement: "Explore this season’s", collection: "collection", country: "Country", language: "Language", label: "Country and language", retail: "Shop for your home", business: "Shop for your business", note: "Country and language preference. Prices and checkout currency are set by your store." },
  de: { announcement: "Entdecken Sie unsere aktuelle", collection: "Kollektion", country: "Land", language: "Sprache", label: "Land und Sprache", retail: "Für Ihr Zuhause", business: "Für Ihr Unternehmen", note: "Land- und Spracheinstellung. Preise und Zahlungswährung werden von Ihrem Store festgelegt." },
};

export function StorefrontAnnouncement({ business = false }: { business?: boolean }) {
  const country = useStorefrontCountries(business ? "b2b" : "b2c");
  const language = useStorefrontLanguages(business ? "b2b" : "b2c");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const intent = useRef(createHoverIntent());
  const focusOnOpen = useRef(false);
  const close = () => { intent.current.cancel(); setOpen(false); };
  useEffect(() => () => intent.current.cancel(), []);
  const displayLocale = language.locale?.split("-")[0] === "de" ? "de" : "en";
  const text = copy[displayLocale];
  const activeLanguage = language.locale ? languageDisplayName(language.locale, displayLocale) : text.language;
  const activeCountry = country.country ? countryDisplayName(country.country, displayLocale) : text.country;

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
    <div className={styles.bar} lang={displayLocale}>
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

          <button ref={trigger} className={styles.trigger} type="button" aria-label={`${text.label}: ${activeCountry}, ${activeLanguage}`} aria-expanded={open} aria-controls={id} onClick={() => { intent.current.cancel(); focusOnOpen.current = !open; setOpen((value) => !value); }}>
            <span className={styles.flag} aria-hidden="true" title={activeCountry}>{country.country ? countryFlag(country.country) : <GlobeAltIcon />}</span><span className={styles.activeLanguage} title={activeLanguage}>{activeLanguage}</span><ChevronDownIcon aria-hidden="true" data-open={open} />
          </button>
          {open && <div ref={panel} id={id} className={styles.panel} onPointerEnter={() => intent.current.cancel()} role="region" aria-label={text.label}>
            <fieldset><legend>{text.country}</legend>
              {country.loading && <p className={styles.languageStatus} role="status">{displayLocale === "de" ? "Länder werden geladen…" : "Loading countries…"}</p>}
              {country.error && <div className={styles.languageStatus} role="status"><p>{displayLocale === "de" ? "Länder konnten nicht geladen werden." : "We couldn’t load the countries."}</p><button className={styles.retry} type="button" onClick={country.retry}>{displayLocale === "de" ? "Erneut versuchen" : "Try again"}</button></div>}
              {!country.loading && !country.error && !country.countries.length && <p className={styles.languageStatus}>{displayLocale === "de" ? "Keine Länder verfügbar." : "No countries available."}</p>}
              <div className={styles.countryOptions}>
                {country.countries.map((code) => <label key={code} className={styles.option}>
                  <input type="radio" name={`${id}-country`} value={code} checked={code === country.country} onChange={() => country.select(code)} />
                  <span className={styles.flag} aria-hidden="true">{countryFlag(code)}</span><span className={styles.languageText}><span>{countryDisplayName(code, displayLocale)}</span><small>{code}</small></span>
                </label>)}
              </div>
            </fieldset>
            <fieldset><legend>{text.language}</legend>
              {language.loading && <p className={styles.languageStatus} role="status">{displayLocale === "de" ? "Sprachen werden geladen…" : "Loading languages…"}</p>}
              {language.error && <div className={styles.languageStatus} role="status"><p>{displayLocale === "de" ? "Sprachen konnten nicht geladen werden." : "We couldn’t load the languages."}</p><button className={styles.retry} type="button" onClick={language.retry}>{displayLocale === "de" ? "Erneut versuchen" : "Try again"}</button></div>}
              {!language.loading && !language.error && !language.languages.length && <p className={styles.languageStatus}>{displayLocale === "de" ? "Keine Sprachen verfügbar." : "No languages available."}</p>}
              <div className={styles.languageOptions}>
                {language.languages.map((locale) => <label key={locale} className={styles.option}>
                  <input type="radio" name={`${id}-language`} value={locale} checked={locale === language.locale} onChange={() => language.select(locale)} />
                  <span className={styles.languageText}><span>{languageDisplayName(locale, displayLocale)}</span><small>{locale}</small></span>
                </label>)}
              </div>
            </fieldset>
            <p className={styles.note}>{text.note}</p>
          </div>}
        </div>
      </div>
    </div>
  );
}
