import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Drivers de banco rodam fora do bundle (PGlite usa WASM; pg usa sockets nativos).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
