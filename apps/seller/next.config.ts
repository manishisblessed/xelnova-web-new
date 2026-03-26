import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@xelnova/ui', '@xelnova/utils'],
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  /** Lets Google Identity Services communicate with the opener; avoids postMessage COOP warnings during sign-in. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
};

export default nextConfig;
