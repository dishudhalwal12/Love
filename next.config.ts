import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to complete even if there are type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
