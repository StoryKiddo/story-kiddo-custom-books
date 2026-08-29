import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photo uploads travel through a Server Action. Up to four children × 8 MB
  // each, so we raise the default 1MB cap here.
  experimental: {
    serverActions: {
      bodySizeLimit: "36mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/tracks",
        destination: "/themes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
