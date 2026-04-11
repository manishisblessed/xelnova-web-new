import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@xelnova/ui', '@xelnova/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@xelnova/ui', 'recharts'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  poweredByHeader: false,
};

export default nextConfig;
