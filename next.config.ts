import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    JELLYFIN_URL: process.env.JELLYFIN_URL,
    JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY,
    JELLYFIN_USERNAME: process.env.JELLYFIN_USERNAME,
  },
};

export default nextConfig;
