/**
 * next.config.cjs
 * CommonJS fallback: avoid importing TypeScript config at build-time.
 * Read runtime values from env or provide sensible defaults.
 */
const withBundleAnalyzer = (config) => config; // placeholder if you use plugins

const env = {
  // örnek: .env içindeki deðiþkenleri Next'te expose etmek isterseniz buraya ekleyin
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_FEATURE_FLAG: process.env.NEXT_PUBLIC_FEATURE_FLAG ?? 'false',
};

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  env,
  // diðer Next konfigürasyonunuzu buraya taþýyýn (ör. webpack customizations)
});
