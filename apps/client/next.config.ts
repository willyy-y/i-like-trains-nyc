import type { NextConfig } from "next";
import path from "path";

const emptyModule = path.resolve(__dirname, "lib/empty.js");

const nextConfig: NextConfig = {
  transpilePackages: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/react", "@deck.gl/extensions", "@deck.gl/geo-layers"],
  turbopack: {
    resolveAlias: {
      "apache-arrow": emptyModule,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "apache-arrow": false,
    };
    return config;
  },
};

export default nextConfig;
