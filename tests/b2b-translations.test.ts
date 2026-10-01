import { describe, expect, it } from "vitest";
import { translateBusiness } from "../lib/b2b/translations";

describe("B2B interface language", () => {
  it("uses selected base languages while preserving regional locale inputs", () => {
    expect(translateBusiness("de-DE", "All products")).toBe("Alle Produkte");
    expect(translateBusiness("es-ES", "All products")).toBe(
      "Todos los productos",
    );
    expect(translateBusiness("fr-FR", "All products")).toBe(
      "Tous les produits",
    );
    expect(translateBusiness("it-IT", "All products")).toBe("Tutti i prodotti");
    expect(translateBusiness("pt-PT", "All products")).toBe(
      "Todos os produtos",
    );
    expect(translateBusiness("nl-NL", "All products")).toBe("Alle producten");
    expect(translateBusiness("en-GB", "All products")).toBe("All products");
  });
  it("localizes dynamic results without altering the user's search text", () => {
    expect(
      translateBusiness("de-DE", "Results for “{query}”", { query: "ZX-10" }),
    ).toBe("Ergebnisse für „ZX-10“");
    expect(
      translateBusiness("fr-FR", "Showing {start}–{end} of {count}", {
        start: 1,
        end: 12,
        count: 72,
      }),
    ).toBe("Affichage de 1–12 sur 72");
  });
  it("changes primary header/catalog/account labels for every supported non-English locale", () => {
    for (const locale of ["de", "es", "fr", "it", "pt", "nl"]) {
      for (const label of [
        "Search",
        "Recommended",
        "My profile",
        "First name",
        "Country",
        "Save address",
      ])
        expect(translateBusiness(locale, label)).not.toBe(label);
    }
  });
  it("retains English copy for unsupported locales and untranslated content", () => {
    expect(translateBusiness("ja-JP", "All products")).toBe("All products");
    expect(translateBusiness(null, "All products")).toBe("All products");
    expect(translateBusiness("de", "Custom equipment description")).toBe(
      "Custom equipment description",
    );
  });
});
