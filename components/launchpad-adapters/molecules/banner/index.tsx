"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useButtonClassNames from "@/components/launchpad-adapters/atoms/button/useButtonClassNames";
import styles from "./banner.module.css";

// Adapted from Launchpad molecules/banner: app URLs replace Studio references.
export interface BannerProps {
  title: string;
  description?: string;
  eyebrow?: string;
  buttonText?: string;
  buttonLink?: string;
  image?: { src: string; alt: string; position?: string };
  size?: "sm" | "md" | "lg";
  headingLevel?: "h1" | "h2";
  tone?: "light" | "dark";
  priority?: boolean;
}

export default function Banner({ title, description, eyebrow, buttonText, buttonLink = "/products", image, size = "md", headingLevel: Heading = "h2", tone = "light", priority = false }: BannerProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const ctaClassName = useButtonClassNames({ variant: tone === "dark" ? "secondary" : "primary", size: "m", includesIcon: false, className: styles.cta });
  return (
    <section className={`${styles.banner} ${styles[size]} ${styles[tone]}`} aria-label={title}>
      {image?.src && failedSource !== image.src && (
        <div className={styles.media}>
          <Image src={image.src} alt={image.alt} fill unoptimized sizes={size === "lg" ? "100vw" : "(max-width: 700px) 100vw, 50vw"} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} style={{ objectPosition: image.position ?? "center" }} onError={() => setFailedSource(image.src)} />
        </div>
      )}
      <div className={styles.content}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
        {buttonText && <Link className={ctaClassName} href={buttonLink}>{buttonText}<span aria-hidden="true">↗</span></Link>}
      </div>
    </section>
  );
}
