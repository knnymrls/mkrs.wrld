/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Disable client reference manifest optimization that might cause issues
    optimizePackageImports: []
  },
  webpack: (config, { dev, isServer }) => {
    // Fix for client reference manifest issues
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          default: false,
          vendors: false,
          // Create a single vendor chunk for better stability
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          }
        }
      }
    }
    return config
  }
};

module.exports = nextConfig;
