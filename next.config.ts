import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vwaifxueyxjigitcfoia.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'dxbqbwafawbcccuocaoe.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    // Force client reference manifest generation
    turbo: {},
  },
  webpack: (config, { isServer }) => {
    // Ensure client reference manifest is always generated
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        providedExports: true,
        usedExports: true,
      };
    }
    return config;
  },
};

export default nextConfig;
