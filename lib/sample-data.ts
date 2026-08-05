import type { Product } from "./types";
const money = (n: number) => ({
  centAmount: n,
  currencyCode: "USD",
  formatted: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n / 100),
});
export const products: Product[] = [
  {
    id: "p1",
    slug: "aero-task-chair",
    sku: "CHAIR-AERO",
    name: "Aero Task Chair",
    description:
      "Responsive lumbar support and breathable knit for focused workdays.",
    category: "Workspace",
    color: "Graphite",
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=85",
    price: money(48900),
    badges: ["Bestseller", "Ergonomic"],
  },
  {
    id: "p2",
    slug: "arc-desk-lamp",
    sku: "LAMP-ARC",
    name: "Arc Desk Lamp",
    description:
      "Warm, dimmable task light with a sculptural powder-coated arm.",
    category: "Lighting",
    color: "Saffron",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85",
    price: money(12900),
    badges: ["New"],
  },
  {
    id: "p3",
    slug: "grid-shelving",
    sku: "SHELF-GRID",
    name: "Grid Shelving System",
    description:
      "Modular storage that grows from a quiet home office to a full studio.",
    category: "Storage",
    color: "Oak",
    image:
      "https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&w=1000&q=85",
    price: money(74900),
    badges: ["Modular"],
  },
  {
    id: "p4",
    slug: "field-lounge-chair",
    sku: "LOUNGE-FIELD",
    name: "Field Lounge Chair",
    description:
      "A low, generous silhouette built for arrival spaces and reading corners.",
    category: "Seating",
    color: "Forest",
    image:
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1000&q=85",
    price: money(89900),
    badges: ["Trade favorite"],
  },
  {
    id: "p5",
    slug: "softscape-rug",
    sku: "RUG-SOFT",
    name: "Softscape Rug",
    description:
      "Tactile wool blend with a subtle tonal grid for warmer shared spaces.",
    category: "Textiles",
    color: "Sand",
    image:
      "https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1000&q=85",
    price: money(31900),
    badges: ["Low impact"],
  },
  {
    id: "p6",
    slug: "relay-table",
    sku: "TABLE-RELAY",
    name: "Relay Conference Table",
    description:
      "Cable-managed solid ash table sized for collaborative teams of eight.",
    category: "Workspace",
    color: "Oak",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85",
    price: money(189900),
    badges: ["B2B volume pricing"],
  },
];
