import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Prevent Next.js from inferring the wrong workspace root when a stale
  // package-lock.json exists in a parent directory (e.g. /home/meepo/).
  // Without this the build uses the parent as outputFileTracingRoot which can
  // break `next start` file resolution at runtime.
  outputFileTracingRoot: __dirname,

  // better-sqlite3 ships a native .node addon that cannot be bundled by
  // webpack/turbopack. Listing it here forces Next.js to `require()` it at
  // runtime from node_modules instead of trying to inline it.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
