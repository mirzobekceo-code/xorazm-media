import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};

export default config;
