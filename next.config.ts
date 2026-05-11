import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trust the Caddy reverse proxy in front. The proxy.ts file pulls the
  // client IP from x-forwarded-for, so don't strip it.
  serverExternalPackages: ["@prisma/client", "@node-rs/argon2", "better-sqlite3"],
};

export default nextConfig;
