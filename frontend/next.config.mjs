/**
 * ESM Next config (next.config.mjs)
 * Avoid requiring TypeScript modules at config-time.
 * Use environment variables for values that would otherwise be imported.
 */
const withBundleAnalyzer = (config) => config;

const env = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_FEATURE_FLAG: process.env.NEXT_PUBLIC_FEATURE_FLAG ?? 'false',
};

export default withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  env,
  // add other Next settings here (images.domains, rewrites, webpack, etc.)
});

