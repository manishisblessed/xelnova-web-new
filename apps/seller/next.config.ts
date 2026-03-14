import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@xelnova/ui", "@xelnova/utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
