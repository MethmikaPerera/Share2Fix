import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the build light on memory-constrained machines (page-data collection otherwise spawns many workers).
  experimental: { cpus: 2 },
};

export default nextConfig;
