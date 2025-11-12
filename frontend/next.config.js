/**
 * next.config.js
 * CommonJS config to avoid ESM/TS import issues during dev
 * If you later need dynamic imports from TS, use next.config.mjs with proper loader.
 */
const withBundleAnalyzer = (config) => config;

const env = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_FEATURE_FLAG: process.env.NEXT_PUBLIC_FEATURE_FLAG ?? 'false',
};

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  
  env,
  // Add other Next config items here if needed
});


