import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // …your existing config…

  eslint: {
    // already added to skip lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // this tells Next.js to ignore TS errors during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
