import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@xelnova/ui', '@xelnova/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
};

export default nextConfig;
