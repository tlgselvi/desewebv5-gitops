import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: 'standalone', // Required for Docker deployment
	// Optimize images
	images: {
		remotePatterns: [
			{ protocol: 'http', hostname: 'localhost' },
			{ protocol: 'https', hostname: 'yourcdn.com' },
		],
		formats: ['image/webp', 'image/avif'],
		minimumCacheTTL: 60,
	},
	
	// Enable compression
	compress: true,
	
	// Optimize headers
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
				],
			},
			{
				source: '/api/(.*)',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=30, s-maxage=30',
					},
				],
			},
		];
	},
};

export default nextConfig;
