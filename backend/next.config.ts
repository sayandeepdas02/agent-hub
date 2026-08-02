import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Heavy server-side packages that must stay in Node.js runtime
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default nextConfig;
