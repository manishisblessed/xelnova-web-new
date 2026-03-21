import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@xelnova/ui', '@xelnova/utils'],
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
};

export default nextConfig;
