/** @type {import('next').NextConfig} */
console.log("----- LOADING NEXT.CONFIG.JS (CommonJS) -----");

const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001", "host.docker.internal:3001"],
    },
  },
  // Setup Rewrites to Proxy /api/v1 to Backend
  async rewrites() {
    console.log("----- CONFIGURING REWRITES (CommonJS) -----");
    return [
      {
        source: "/google-test",
        destination: "https://www.google.com",
      },
      {
        source: "/api/v1/:path*",
        destination: "http://app:3000/api/v1/:path*", // Proxy to backend container
      },
    ];
  },
};

module.exports = nextConfig;
