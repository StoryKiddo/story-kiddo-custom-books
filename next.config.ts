import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photo uploads travel through a Server Action. The default 1MB cap is too
  // small for a typical phone picture, so we raise it here.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
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
