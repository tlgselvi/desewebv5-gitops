import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { URL } from 'url';
import { z } from 'zod';
import { db, seoMetrics, seoProjects } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { seoLogger } from '@/utils/logger.js';
import { recordSeoAnalysis } from '@/middleware/prometheus.js';
// Validation schemas
const SeoAnalysisRequestSchema = z.object({
    projectId: z.string().uuid(),
    urls: z.array(z.string().url()).min(1).max(10),
    options: z.object({
        device: z.enum(['mobile', 'desktop']).default('desktop'),
        throttling: z.enum(['slow3G', 'fast3G', '4G', 'none']).default('4G'),
        categories: z.array(z.string()).default(['performance', 'accessibility', 'best-practices', 'seo']),
    }).optional(),
});
const CoreWebVitalsSchema = z.object({
    firstContentfulPaint: z.number().optional(),
    largestContentfulPaint: z.number().optional(),
    cumulativeLayoutShift: z.number().optional(),
    firstInputDelay: z.number().optional(),
    totalBlockingTime: z.number().optional(),
    speedIndex: z.number().optional(),
    timeToInteractive: z.number().optional(),
});
export class SeoAnalyzer {
    browser = null;
    async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            });
            seoLogger.info('SEO Analyzer initialized successfully');
        }
        catch (error) {
            seoLogger.error('Failed to initialize SEO Analyzer', { error });
            throw error;
        }
    }
    async analyzeUrl(url, options = {}) {
        if (!this.browser) {
            await this.initialize();
        }
        const { device = 'desktop', throttling = '4G', categories = ['performance', 'accessibility', 'best-practices', 'seo'], } = options;
        try {
            const page = await this.browser.newPage();
            // Set viewport based on device
            await page.setViewport({
                width: device === 'mobile' ? 375 : 1280,
                height: device === 'mobile' ? 667 : 720,
                isMobile: device === 'mobile',
            });
            // Configure throttling
            const client = await page.target().createCDPSession();
            await client.send('Network.enable');
            if (throttling !== 'none') {
                const throttlingConfig = this.getThrottlingConfig(throttling);
                await client.send('Network.emulateNetworkConditions', throttlingConfig);
            }
            // Run Lighthouse
            const lighthouseOptions = {
                logLevel: 'error',
                output: 'json',
                onlyCategories: categories,
                port: new URL(await this.browser.wsEndpoint()).port,
            };
            const result = await lighthouse(url, lighthouseOptions);
            await page.close();
            if (!result) {
                throw new Error('Lighthouse analysis failed');
            }
            return this.processLighthouseResults(result, url);
        }
        catch (error) {
            seoLogger.error('SEO analysis failed', { url, error });
            throw error;
        }
    }
    getThrottlingConfig(throttling) {
        const configs = {
            slow3G: {
                offline: false,
                downloadThroughput: 500 * 1024 / 8, // 500 Kbps
                uploadThroughput: 500 * 1024 / 8,
                latency: 400,
            },
            fast3G: {
                offline: false,
                downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
                uploadThroughput: 750 * 1024 / 8, // 750 Kbps
                latency: 150,
            },
            '4G': {
                offline: false,
                downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbps
                uploadThroughput: 5 * 1024 * 1024 / 8, // 5 Mbps
                latency: 20,
            },
            none: {
                offline: false,
                downloadThroughput: -1,
                uploadThroughput: -1,
                latency: 0,
            },
        };
        return configs[throttling] || configs['4G'];
    }
    processLighthouseResults(result, url) {
        const lhr = result.lhr;
        const audits = lhr.audits;
        // Extract Core Web Vitals
        const coreWebVitals = {
            firstContentfulPaint: audits['first-contentful-paint']?.numericValue,
            largestContentfulPaint: audits['largest-contentful-paint']?.numericValue,
            cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue,
            firstInputDelay: audits['max-potential-fid']?.numericValue,
            totalBlockingTime: audits['total-blocking-time']?.numericValue,
            speedIndex: audits['speed-index']?.numericValue,
            timeToInteractive: audits['interactive']?.numericValue,
        };
        // Extract category scores
        const scores = {
            performance: Math.round((lhr.categories.performance?.score || 0) * 100),
            accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
            seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        };
        // Extract opportunities and diagnostics
        const opportunities = Object.values(audits)
            .filter((audit) => audit.details?.type === 'opportunity')
            .map((audit) => ({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            numericValue: audit.numericValue,
            displayValue: audit.displayValue,
        }));
        const diagnostics = Object.values(audits)
            .filter((audit) => audit.details?.type === 'diagnostic')
            .map((audit) => ({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            details: audit.details,
        }));
        return {
            url,
            scores,
            coreWebVitals,
            opportunities,
            diagnostics,
            rawData: lhr,
            analyzedAt: new Date().toISOString(),
        };
    }
    async analyzeProject(request) {
        // Validate request
        const validatedRequest = SeoAnalysisRequestSchema.parse(request);
        // Verify project exists
        const project = await db
            .select()
            .from(seoProjects)
            .where(eq(seoProjects.id, validatedRequest.projectId))
            .limit(1);
        if (project.length === 0) {
            throw new Error('Project not found');
        }
        const results = [];
        const errors = [];
        seoLogger.info('Starting SEO analysis', {
            projectId: validatedRequest.projectId,
            urlCount: validatedRequest.urls.length,
        });
        // Record metrics
        recordSeoAnalysis(validatedRequest.projectId, 'lighthouse');
        for (const url of validatedRequest.urls) {
            try {
                const analysis = await this.analyzeUrl(url, validatedRequest.options);
                // Save to database
                await db.insert(seoMetrics).values({
                    projectId: validatedRequest.projectId,
                    url,
                    performance: analysis.scores.performance,
                    accessibility: analysis.scores.accessibility,
                    bestPractices: analysis.scores.bestPractices,
                    seo: analysis.scores.seo,
                    firstContentfulPaint: analysis.coreWebVitals.firstContentfulPaint,
                    largestContentfulPaint: analysis.coreWebVitals.largestContentfulPaint,
                    cumulativeLayoutShift: analysis.coreWebVitals.cumulativeLayoutShift,
                    firstInputDelay: analysis.coreWebVitals.firstInputDelay,
                    totalBlockingTime: analysis.coreWebVitals.totalBlockingTime,
                    speedIndex: analysis.coreWebVitals.speedIndex,
                    timeToInteractive: analysis.coreWebVitals.timeToInteractive,
                    rawData: analysis.rawData,
                });
                results.push(analysis);
                seoLogger.info('URL analysis completed', { url, scores: analysis.scores });
            }
            catch (error) {
                seoLogger.error('URL analysis failed', { url, error });
                errors.push({ url, error: error.message });
            }
        }
        return {
            projectId: validatedRequest.projectId,
            totalUrls: validatedRequest.urls.length,
            successfulAnalyses: results.length,
            failedAnalyses: errors.length,
            results,
            errors,
            analyzedAt: new Date().toISOString(),
        };
    }
    async getProjectMetrics(projectId, limit = 10) {
        const metrics = await db
            .select()
            .from(seoMetrics)
            .where(eq(seoMetrics.projectId, projectId))
            .orderBy(seoMetrics.measuredAt)
            .limit(limit);
        return metrics;
    }
    async getProjectTrends(projectId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const metrics = await db
            .select()
            .from(seoMetrics)
            .where(eq(seoMetrics.projectId, projectId)
        // Add date filter here when needed
        )
            .orderBy(seoMetrics.measuredAt);
        // Calculate trends
        const trends = this.calculateTrends(metrics);
        return {
            projectId,
            period: `${days} days`,
            metrics,
            trends,
        };
    }
    calculateTrends(metrics) {
        if (metrics.length < 2) {
            return null;
        }
        const latest = metrics[metrics.length - 1];
        const previous = metrics[metrics.length - 2];
        return {
            performance: {
                current: latest.performance,
                previous: previous.performance,
                change: latest.performance - previous.performance,
                changePercent: ((latest.performance - previous.performance) / previous.performance) * 100,
            },
            accessibility: {
                current: latest.accessibility,
                previous: previous.accessibility,
                change: latest.accessibility - previous.accessibility,
                changePercent: ((latest.accessibility - previous.accessibility) / previous.accessibility) * 100,
            },
            seo: {
                current: latest.seo,
                previous: previous.seo,
                change: latest.seo - previous.seo,
                changePercent: ((latest.seo - previous.seo) / previous.seo) * 100,
            },
        };
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            seoLogger.info('SEO Analyzer cleaned up');
        }
    }
}
// Singleton instance
export const seoAnalyzer = new SeoAnalyzer();
//# sourceMappingURL=seoAnalyzer.js.map