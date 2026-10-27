import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  images: { unoptimized: true },
  // VPS rejimida video server orqali yuklanadi (Vercel'da esa to'g'ridan-to'g'ri Blob'ga)
  experimental: { serverActions: { bodySizeLimit: "110mb" } },
  // Shaxsiy portfolio sayt uchun qisqa manzil: /u/<manzil> — /m/<manzil> bilan bir xil sahifa
  async rewrites() {
    return [{ source: "/u/:slug", destination: "/m/:slug" }];
  },
};

export default config;
