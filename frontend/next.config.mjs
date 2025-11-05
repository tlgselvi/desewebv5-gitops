/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  
  // Performance optimizations
  // swcMinify removed - SWC is default in Next.js 16
  compress: true, // Enable gzip compression
  
  // Turbopack configuration for Next.js 16
  turbopack: {},
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true, // Optimize CSS output
    optimizePackageImports: ['@tanstack/react-query', 'axios'], // Tree-shake unused exports
  },
  
  // Development error overlay
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Better error reporting in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: false, // Better error messages
      };
    }
    return config;
  },
  
  // Note: Webpack config removed - Next.js 16 uses Turbopack by default
  // For Turbopack-specific optimizations, use the turbopack config above
};

export default nextConfig;
