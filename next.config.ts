import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The floating dev badge sits on top of the voice dock and shows up in
  // screenshot QA. Nothing depends on it.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
