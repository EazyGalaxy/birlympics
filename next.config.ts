import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // …any existing config…

  eslint: {
    // Allow production builds even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
