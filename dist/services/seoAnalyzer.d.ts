import { z } from 'zod';
declare const SeoAnalysisRequestSchema: z.ZodObject<{
    projectId: z.ZodString;
    urls: z.ZodArray<z.ZodString>;
    options: z.ZodOptional<z.ZodObject<{
        device: z.ZodDefault<z.ZodEnum<{
            mobile: "mobile";
            desktop: "desktop";
        }>>;
        throttling: z.ZodDefault<z.ZodEnum<{
            slow3G: "slow3G";
            fast3G: "fast3G";
            "4G": "4G";
            none: "none";
        }>>;
        categories: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SeoAnalysisRequest = z.infer<typeof SeoAnalysisRequestSchema>;
export type CoreWebVitals = {
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
    firstInputDelay?: number;
    totalBlockingTime?: number;
    speedIndex?: number;
    timeToInteractive?: number;
};
interface LighthouseScoreSummary {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
}
interface LighthouseAuditDetails {
    type?: string;
    [key: string]: unknown;
}
interface LighthouseAudit {
    id: string;
    title: string;
    description?: string;
    score: number | null;
    numericValue?: number;
    displayValue?: string;
    details?: LighthouseAuditDetails;
}
interface LighthouseCategory {
    score?: number | null;
}
interface LighthouseCategories {
    performance?: LighthouseCategory;
    accessibility?: LighthouseCategory;
    ['best-practices']?: LighthouseCategory;
    seo?: LighthouseCategory;
    [key: string]: LighthouseCategory | undefined;
}
interface LighthouseRunResult {
    lhr: {
        categories: LighthouseCategories;
        audits: Record<string, LighthouseAudit>;
    };
}
interface LighthouseOpportunity {
    id: string;
    title: string;
    description?: string;
    score: number | null;
    numericValue?: number;
    displayValue?: string;
}
interface LighthouseDiagnostic {
    id: string;
    title: string;
    description?: string;
    score: number | null;
    details?: LighthouseAuditDetails;
}
interface LighthouseAnalysisResult {
    url: string;
    scores: LighthouseScoreSummary;
    coreWebVitals: CoreWebVitals;
    opportunities: LighthouseOpportunity[];
    diagnostics: LighthouseDiagnostic[];
    rawData: LighthouseRunResult['lhr'];
    analyzedAt: string;
}
interface SeoProjectAnalysisSummary {
    projectId: string;
    totalUrls: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    results: LighthouseAnalysisResult[];
    errors: Array<{
        url: string;
        error: string;
    }>;
    analyzedAt: string;
}
type MetricTrend = {
    current: number | null;
    previous: number | null;
    change: number | null;
    changePercent: number | null;
};
type MetricTrendSummary = {
    performance: MetricTrend;
    accessibility: MetricTrend;
    seo: MetricTrend;
};
export declare class SeoAnalyzer {
    private browser;
    initialize(): Promise<void>;
    analyzeUrl(url: string, options?: SeoAnalysisRequest['options']): Promise<LighthouseAnalysisResult>;
    private getThrottlingConfig;
    private processLighthouseResults;
    analyzeProject(request: SeoAnalysisRequest): Promise<SeoProjectAnalysisSummary>;
    getProjectMetrics(projectId: string, limit?: number): Promise<{
        id: string;
        projectId: string;
        url: string;
        performance: string | null;
        accessibility: string | null;
        bestPractices: string | null;
        seo: string | null;
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
            id: string;
            projectId: string;
            url: string;
            performance: string | null;
            accessibility: string | null;
            bestPractices: string | null;
            seo: string | null;
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
        trends: MetricTrendSummary | null;
    }>;
    private calculateTrends;
    cleanup(): Promise<void>;
}
export declare const seoAnalyzer: SeoAnalyzer;
export {};
//# sourceMappingURL=seoAnalyzer.d.ts.map