import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@xelnova/api', '@xelnova/ui', '@xelnova/utils'],
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
