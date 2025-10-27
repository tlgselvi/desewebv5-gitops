import { z } from 'zod';
declare const SeoAnalysisRequestSchema: z.ZodObject<{
    projectId: z.ZodString;
    urls: z.ZodArray<z.ZodString, "many">;
    options: z.ZodOptional<z.ZodObject<{
        device: z.ZodDefault<z.ZodEnum<["mobile", "desktop"]>>;
        throttling: z.ZodDefault<z.ZodEnum<["slow3G", "fast3G", "4G", "none"]>>;
        categories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        categories: string[];
        device: "mobile" | "desktop";
        throttling: "slow3G" | "fast3G" | "4G" | "none";
    }, {
        categories?: string[] | undefined;
        device?: "mobile" | "desktop" | undefined;
        throttling?: "slow3G" | "fast3G" | "4G" | "none" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    urls: string[];
    options?: {
        categories: string[];
        device: "mobile" | "desktop";
        throttling: "slow3G" | "fast3G" | "4G" | "none";
    } | undefined;
}, {
    projectId: string;
    urls: string[];
    options?: {
        categories?: string[] | undefined;
        device?: "mobile" | "desktop" | undefined;
        throttling?: "slow3G" | "fast3G" | "4G" | "none" | undefined;
    } | undefined;
}>;
declare const CoreWebVitalsSchema: z.ZodObject<{
    firstContentfulPaint: z.ZodOptional<z.ZodNumber>;
    largestContentfulPaint: z.ZodOptional<z.ZodNumber>;
    cumulativeLayoutShift: z.ZodOptional<z.ZodNumber>;
    firstInputDelay: z.ZodOptional<z.ZodNumber>;
    totalBlockingTime: z.ZodOptional<z.ZodNumber>;
    speedIndex: z.ZodOptional<z.ZodNumber>;
    timeToInteractive: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    firstContentfulPaint?: number | undefined;
    largestContentfulPaint?: number | undefined;
    cumulativeLayoutShift?: number | undefined;
    firstInputDelay?: number | undefined;
    totalBlockingTime?: number | undefined;
    speedIndex?: number | undefined;
    timeToInteractive?: number | undefined;
}, {
    firstContentfulPaint?: number | undefined;
    largestContentfulPaint?: number | undefined;
    cumulativeLayoutShift?: number | undefined;
    firstInputDelay?: number | undefined;
    totalBlockingTime?: number | undefined;
    speedIndex?: number | undefined;
    timeToInteractive?: number | undefined;
}>;
export type SeoAnalysisRequest = z.infer<typeof SeoAnalysisRequestSchema>;
export type CoreWebVitals = z.infer<typeof CoreWebVitalsSchema>;
export declare class SeoAnalyzer {
    private browser;
    initialize(): Promise<void>;
    analyzeUrl(url: string, options?: SeoAnalysisRequest['options']): Promise<any>;
    private getThrottlingConfig;
    private processLighthouseResults;
    analyzeProject(request: SeoAnalysisRequest): Promise<any>;
    getProjectMetrics(projectId: string, limit?: number): Promise<{
        url: string;
        seo: string | null;
        id: string;
        projectId: string;
        performance: string | null;
        accessibility: string | null;
        bestPractices: string | null;
        firstContentfulPaint: string | null;
        largestContentfulPaint: string | null;
        cumulativeLayoutShift: string | null;
        firstInputDelay: string | null;
        totalBlockingTime: string | null;
        speedIndex: string | null;
        timeToInteractive: string | null;
        rawData: unknown;
        measuredAt: Date;
    }[]>;
    getProjectTrends(projectId: string, days?: number): Promise<{
        projectId: string;
        period: string;
        metrics: {
            url: string;
            seo: string | null;
            id: string;
            projectId: string;
            performance: string | null;
            accessibility: string | null;
            bestPractices: string | null;
            firstContentfulPaint: string | null;
            largestContentfulPaint: string | null;
            cumulativeLayoutShift: string | null;
            firstInputDelay: string | null;
            totalBlockingTime: string | null;
            speedIndex: string | null;
            timeToInteractive: string | null;
            rawData: unknown;
            measuredAt: Date;
        }[];
        trends: {
            performance: {
                current: any;
                previous: any;
                change: number;
                changePercent: number;
            };
            accessibility: {
                current: any;
                previous: any;
                change: number;
                changePercent: number;
            };
            seo: {
                current: any;
                previous: any;
                change: number;
                changePercent: number;
            };
        } | null;
    }>;
    private calculateTrends;
    cleanup(): Promise<void>;
}
export declare const seoAnalyzer: SeoAnalyzer;
export {};
//# sourceMappingURL=seoAnalyzer.d.ts.map