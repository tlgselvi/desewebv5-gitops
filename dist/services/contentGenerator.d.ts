import { z } from 'zod';
declare const ContentGenerationRequestSchema: z.ZodObject<{
    projectId: z.ZodString;
    contentType: z.ZodEnum<["landing_page", "blog_post", "service_page", "product_page"]>;
    templateId: z.ZodOptional<z.ZodString>;
    keywords: z.ZodArray<z.ZodString, "many">;
    targetAudience: z.ZodOptional<z.ZodString>;
    tone: z.ZodDefault<z.ZodEnum<["professional", "casual", "technical", "friendly"]>>;
    wordCount: z.ZodDefault<z.ZodNumber>;
    includeImages: z.ZodDefault<z.ZodBoolean>;
    eEatCompliance: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    contentType: "landing_page" | "blog_post" | "service_page" | "product_page";
    keywords: string[];
    tone: "professional" | "casual" | "technical" | "friendly";
    wordCount: number;
    includeImages: boolean;
    eEatCompliance: boolean;
    templateId?: string | undefined;
    targetAudience?: string | undefined;
}, {
    projectId: string;
    contentType: "landing_page" | "blog_post" | "service_page" | "product_page";
    keywords: string[];
    templateId?: string | undefined;
    targetAudience?: string | undefined;
    tone?: "professional" | "casual" | "technical" | "friendly" | undefined;
    wordCount?: number | undefined;
    includeImages?: boolean | undefined;
    eEatCompliance?: boolean | undefined;
}>;
declare const EEAtscoreSchema: z.ZodObject<{
    expertise: z.ZodNumber;
    experience: z.ZodNumber;
    authoritativeness: z.ZodNumber;
    trustworthiness: z.ZodNumber;
    overall: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    expertise: number;
    experience: number;
    authoritativeness: number;
    trustworthiness: number;
    overall: number;
}, {
    expertise: number;
    experience: number;
    authoritativeness: number;
    trustworthiness: number;
    overall: number;
}>;
export type ContentGenerationRequest = z.infer<typeof ContentGenerationRequestSchema>;
export type EEAtscore = z.infer<typeof EEAtscoreSchema>;
export declare class ContentGenerator {
    private openai;
    constructor();
    generateContent(request: ContentGenerationRequest): Promise<any>;
    private generateFromTemplate;
    private generateFromScratch;
    private buildPrompt;
    private extractTitle;
    private calculateQualityScore;
    private calculateKeywordDensity;
    private calculateEEATScore;
    private scoreExpertise;
    private scoreExperience;
    private scoreAuthoritativeness;
    private scoreTrustworthiness;
    createTemplate(templateData: {
        name: string;
        type: string;
        template: string;
        variables?: Record<string, any>;
    }): Promise<{
        type: string;
        name: string;
        qualityThreshold: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        template: string;
        variables: Record<string, any> | null;
        eEatScore: string | null;
    } | undefined>;
    getTemplates(type?: string): Promise<{
        type: string;
        name: string;
        qualityThreshold: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        template: string;
        variables: Record<string, any> | null;
        eEatScore: string | null;
    }[]>;
    getGeneratedContent(projectId: string, contentType?: string): Promise<{
        status: string;
        url: string | null;
        content: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
        eEatScore: string | null;
        templateId: string | null;
        title: string;
        contentType: string;
        keywords: string[] | null;
        qualityScore: string | null;
        publishedAt: Date | null;
    }[]>;
}
export declare const contentGenerator: ContentGenerator;
export {};
//# sourceMappingURL=contentGenerator.d.ts.map