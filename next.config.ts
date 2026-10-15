import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite driver must not be bundled.
  serverExternalPackages: ["better-sqlite3", "bwip-js"],
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
