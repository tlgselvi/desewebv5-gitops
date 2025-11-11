const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  experimental: {
    externalDir: true,
    useWebpack: true,
  },
};

module.exports = nextConfig;
