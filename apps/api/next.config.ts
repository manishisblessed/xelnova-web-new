import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow CORS from admin and seller app origins
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Role' },
        ],
      },
    ];
  },
};

export default nextConfig;
