import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return { beforeFiles: [], afterFiles: [], fallback: [] };
    // Unmatched /api/* requests fall through to the backend service.
    // Auth, workspace, profile, and invite routes are handled locally
    // because those route files exist in this app.
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
