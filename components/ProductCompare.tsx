"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCodeCompare,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { AddToCart } from "@/components/AddToCart";
import { useToast } from "@/components/Toast";
import {
  isCompareProductData,
  type CompareProductData,
} from "@/components/ProductCompareData";

const storageKey = "launchpad-compare-products";

function readCompareProducts() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCompareProductData) : [];
  } catch {
    return [];
  }
}

function writeCompareProducts(products: CompareProductData[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(products));
  window.dispatchEvent(new Event(storageKey));
}

export function useCompareProducts() {
  const [products, setProducts] = useState<CompareProductData[]>([]);

  useEffect(() => {
    const refresh = () => setProducts(readCompareProducts());

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(storageKey, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(storageKey, refresh);
    };
  }, []);

  const actions = useMemo(
    () => ({
      add(product: CompareProductData) {
        const current = readCompareProducts();
        if (current.some((item) => item.id === product.id)) return "exists";
        writeCompareProducts([...current, product]);
        return "added";
      },
      remove(productId: string) {
        writeCompareProducts(
          readCompareProducts().filter((product) => product.id !== productId),
        );
      },
      clear() {
        writeCompareProducts([]);
      },
    }),
    [],
  );

  return { products, ...actions };
}

export function AddToCompare({
  compact = false,
  product,
}: {
  compact?: boolean;
  product: CompareProductData;
}) {
  const { add, products } = useCompareProducts();
  const showToast = useToast();
  const selected = products.some((item) => item.id === product.id);

  function addToCompare() {
    const result = add(product);

    if (result === "exists") {
      showToast("This product is already in compare.", "info");
      return;
    }

    showToast("Product added to compare.", "success");
  }

  return (
    <button
      aria-label={
        selected ? "Product added to compare" : "Add product to compare"
      }
      aria-pressed={selected}
      className={`compare-button${compact ? " compact" : ""}${
        selected ? " selected" : ""
      }`}
      onClick={addToCompare}
      title={selected ? "Added to compare" : "Add to compare"}
      type="button"
    >
      <FontAwesomeIcon aria-hidden="true" icon={faCodeCompare} />
    </button>
  );
}

export function HeaderCompareLink() {
  const { products } = useCompareProducts();

  return (
    <Link className="header-compare-link" href="/compare">
      <FontAwesomeIcon aria-hidden="true" icon={faCodeCompare} />
      <span>Compare</span>
      {products.length ? <strong>{products.length}</strong> : null}
    </Link>
  );
}

function compareRows(products: CompareProductData[]) {
  const rows = [
    {
      key: "sku",
      label: "SKU",
      values: products.map((product) => product.sku),
    },
    {
      key: "category",
      label: "Category",
      values: products.map((product) => product.category),
    },
    {
      key: "color",
      label: "Color",
      values: products.map((product) => product.color ?? ""),
    },
    {
      key: "description",
      label: "Description",
      values: products.map((product) => product.description ?? ""),
    },
  ];
  const specNames = new Map<string, string>();

  for (const product of products) {
    for (const spec of product.specifications ?? []) {
      if (!specNames.has(spec.name)) specNames.set(spec.name, spec.label);
    }
  }

  for (const [name, label] of specNames) {
    rows.push({
      key: `spec-${name}`,
      label,
      values: products.map(
        (product) =>
          product.specifications?.find((spec) => spec.name === name)?.value ?? "",
      ),
    });
  }

  return rows.filter((row) => row.values.some(Boolean));
}

export function ComparePage() {
  const { clear, products, remove } = useCompareProducts();
  const rows = compareRows(products);

  return (
    <main className="shell compare-page">
      <header className="page-head compare-page-head">
        <div>
          <p className="eyebrow">Product compare</p>
          <h1>Compare Products</h1>
          <p className="muted">
            Compare products side by side. Scroll horizontally when the list is
            long.
          </p>
        </div>
        {products.length ? (
          <button className="text-button" onClick={clear} type="button">
            <FontAwesomeIcon aria-hidden="true" icon={faTrashCan} />
            <span>Clear all</span>
          </button>
        ) : null}
      </header>

      {!products.length ? (
        <section className="panel empty-state compare-empty">
          <h2>No products to compare</h2>
          <p className="muted">
            Add products from catalog pages, product detail pages, or product
            sliders.
          </p>
          <Link className="button accent" href="/products">
            Browse products
          </Link>
        </section>
      ) : (
        <section
          aria-label="Compared products"
          className="compare-table-wrap"
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                {products.map((product) => (
                  <th key={product.id} scope="col">
                    <div className="compare-product-head">
                      <button
                        aria-label={`Remove ${product.name} from compare`}
                        onClick={() => remove(product.id)}
                        type="button"
                      >
                        <FontAwesomeIcon aria-hidden="true" icon={faXmark} />
                      </button>
                      <Link href={`/products/${product.slug}`}>
                        <img src={product.image} alt={product.name} />
                        <span>{product.name}</span>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price</th>
                {products.map((product) => (
                  <td key={product.id}>
                    <strong>{product.price.formatted}</strong>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Actions</th>
                {products.map((product) => (
                  <td key={product.id}>
                    <AddToCart compact productId={product.id} sku={product.sku} />
                  </td>
                ))}
              </tr>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={`${row.key}-${products[index]?.id}`}>
                      {value || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
