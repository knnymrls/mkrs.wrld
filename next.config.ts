import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
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
  // Performance optimizations
  // swcMinify is enabled by default in Next.js 15+
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  // Fix for client reference manifest issues in Next.js 15
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@heroicons/react', 'framer-motion'],
  },
  // Vercel-specific configuration to handle client reference manifest issues
  poweredByHeader: false,
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Development-specific optimizations
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Cache configuration - only enable filesystem cache in development
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    } else {
      // Disable filesystem cache in production builds
      config.cache = false;
    }

    // Vercel-specific fixes for client reference manifest
    if (!dev && !isServer) {
      // Ensure client reference manifest is properly generated
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            default: {
              ...config.optimization?.splitChunks?.cacheGroups?.default,
              minChunks: 1,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
