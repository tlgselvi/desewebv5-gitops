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
  
  // Note: Webpack config removed - Next.js 16 uses Turbopack by default
  // For Turbopack-specific optimizations, use the turbopack config above
};

export default nextConfig;
