import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/react", "@deck.gl/extensions", "@deck.gl/geo-layers"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "apache-arrow": false,
    };
    return config;
  },
};

export default nextConfig;
