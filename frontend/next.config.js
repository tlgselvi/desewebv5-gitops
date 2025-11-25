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
    // Use localhost for local dev, app:3000 for Docker
    const backendUrl = process.env.BACKEND_URL || 
      (process.env.NODE_ENV === 'production' ? 'http://app:3000' : 'http://localhost:3000');
    console.log("Backend URL for proxy:", backendUrl);
    return [
      {
        source: "/google-test",
        destination: "https://www.google.com",
      },
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`, // Proxy to backend
      },
    ];
  },
};

module.exports = nextConfig;
