import type { NextConfig } from "next";

const config: NextConfig = {
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};

export default config;
