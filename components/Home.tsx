import Banner from "@/components/commercetools-ui/molecules/banner/campaign";
import styles from "./Home.module.css";
import Link from "next/link";
import { connection } from "next/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { ModeBar } from "./ModeBar";
import { ProductCard } from "./ProductCard";
import { listHeaderCategories, searchProducts } from "@/lib/ct/catalog";
import type { StoreMode } from "@/lib/types";
export async function Home({ mode }: { mode: StoreMode }) {
  await connection();
  const [{ products }, categories] = await Promise.all([
    searchProducts(),
    listHeaderCategories(),
  ]);
  const b2b = mode === "b2b";
  const firstCampaignProduct = products.find((product) => product.image);
  const secondCampaignProduct = products.find((product) => product.image && product.image !== firstCampaignProduct?.image);
  return (
    <>
      <ModeBar mode={mode} />
      <main className="shell">
        <div className={styles.campaigns}>
          <Banner
            image={{ src: "/launchpad/category-banner.png", alt: "A considered interior from the Launchpad collection", position: "center" }}
            title={b2b ? "Procure with confidence." : "Make room for good work."}
            eyebrow={b2b ? "Spaces that bring teams together" : "The workday, beautifully considered"}
            description={b2b ? "Bring your next workspace together, one considered piece at a time." : "Thoughtful furniture. Everyday comfort. A space that feels like you."}
            buttonText="Explore the collection"
            buttonLink="/products"
            headingLevel="h1"
            size="lg"
            tone="dark"
            priority
          />
          <div className={styles.promotions}>
            <Banner
              eyebrow="Find your favorite"
              title="Small details. Better days."
              description="Discover the pieces that make a space your own."
              image={firstCampaignProduct ? { src: firstCampaignProduct.image, alt: firstCampaignProduct.name } : undefined}
              buttonText="Shop the collection"
              buttonLink="/products"
            />
            <Banner
              eyebrow="Design worth knowing"
              title="Good design starts here."
              description="Explore our brands and find a new point of view."
              image={secondCampaignProduct ? { src: secondCampaignProduct.image, alt: secondCampaignProduct.name } : undefined}
              buttonText="Discover brands"
              buttonLink="/shop-by-brand"
            />
          </div>
        </div>
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Find your zone</span>
              <h2>Shop by space</h2>
            </div>
          </div>
          <div className="categories">
            {categories.slice(0, 4).map((category, i) => (
              <Link
                href={`/products?categoryId=${encodeURIComponent(category.id)}&category=${encodeURIComponent(category.name)}`}
                className="category"
                key={category.id}
              >
                <span>0{i + 1}</span>
                <h3>
                  <span>{category.name}</span>
                  <FontAwesomeIcon aria-hidden="true" icon={faArrowRight} />
                </h3>
              </Link>
            ))}
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Curated essentials</span>
              <h2>
                {b2b ? "Popular with project teams" : "Built for better days"}
              </h2>
            </div>
            <Link className="pill" href="/products">
              View all
            </Link>
          </div>
          <div className="grid">
            {products.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
