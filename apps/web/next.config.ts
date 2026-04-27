import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "spoonacular.com",
        pathname: "/cdn/ingredients_**",
      },
    ],
  },
};

export default nextConfig;
