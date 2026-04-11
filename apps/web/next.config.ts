import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@xelnova/api', '@xelnova/ui', '@xelnova/utils'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'xelnova.in', pathname: '/**' },
      { protocol: 'https', hostname: 'www.xelnova.in', pathname: '/**' },
      { protocol: 'https', hostname: 'api.xelnova.in', pathname: '/**' },
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
