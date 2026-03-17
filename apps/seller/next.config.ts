import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@xelnova/ui", "@xelnova/utils"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
