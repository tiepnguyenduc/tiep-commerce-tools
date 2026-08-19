"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import type { Swiper as SwiperClass } from "swiper";
import { A11y, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { ProductItemData } from "@/components/ProductItemData";

type ProductItemSliderProps = {
  className?: string;
  eyebrow?: string;
  products: ProductItemData[];
  renderAction?: (product: ProductItemData) => ReactNode;
  title: string;
};

type SliderEdges = {
  isBeginning: boolean;
  isEnd: boolean;
};

function sliderEdges(swiper: SwiperClass | null, products: ProductItemData[]) {
  return {
    isBeginning: swiper?.isBeginning ?? true,
    isEnd: swiper?.isEnd ?? products.length <= 1,
  };
}

export function ProductItemSlider({
  className,
  eyebrow,
  products,
  renderAction,
  title,
}: ProductItemSliderProps) {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const [edges, setEdges] = useState<SliderEdges>(() =>
    sliderEdges(null, products),
  );
  const classes = ["product-item-slider", className].filter(Boolean).join(" ");

  useEffect(() => {
    swiper?.update();
    setEdges(sliderEdges(swiper, products));
  }, [products, swiper]);

  if (!products.length) return null;

  function syncEdges(nextSwiper: SwiperClass) {
    setEdges(sliderEdges(nextSwiper, products));
  }

  return (
    <section className={classes}>
      <div className="cart-panel-head">
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
        </div>
        {products.length > 1 ? (
          <div className="recent-slider-actions">
            <button
              aria-label={`Show previous ${title.toLowerCase()}`}
              disabled={edges.isBeginning}
              onClick={() => swiper?.slidePrev()}
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faChevronLeft} />
            </button>
            <button
              aria-label={`Show next ${title.toLowerCase()}`}
              disabled={edges.isEnd}
              onClick={() => swiper?.slideNext()}
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faChevronRight} />
            </button>
          </div>
        ) : null}
      </div>
      <Swiper
        a11y={{ enabled: true }}
        className="recent-slider"
        keyboard
        modules={[A11y, Keyboard]}
        onAfterInit={syncEdges}
        onReachBeginning={syncEdges}
        onReachEnd={syncEdges}
        onResize={syncEdges}
        onSlideChange={syncEdges}
        onSwiper={(nextSwiper) => {
          setSwiper(nextSwiper);
          setEdges(sliderEdges(nextSwiper, products));
        }}
        slidesPerView="auto"
        spaceBetween={16}
      >
        {products.map((product) => (
          <SwiperSlide className="recent-slide" key={product.id}>
            <article className="recent-product">
              <Link
                className="recent-product-media"
                href={`/products/${product.slug}`}
              >
                <img src={product.image} alt={product.name} />
              </Link>
              <div>
                <span className="tag">{product.category}</span>
                <h3>
                  <Link href={`/products/${product.slug}`}>{product.name}</Link>
                </h3>
                <p className="muted">{product.sku}</p>
                <div className="row">
                  <strong>{product.price.formatted}</strong>
                  {renderAction?.(product)}
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
