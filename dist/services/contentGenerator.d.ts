import { z } from 'zod';
declare const ContentGenerationRequestSchema: z.ZodObject<{
    projectId: z.ZodString;
    contentType: z.ZodEnum<{
        landing_page: "landing_page";
        blog_post: "blog_post";
        service_page: "service_page";
        product_page: "product_page";
    }>;
    templateId: z.ZodOptional<z.ZodString>;
    keywords: z.ZodArray<z.ZodString>;
    targetAudience: z.ZodOptional<z.ZodString>;
    tone: z.ZodDefault<z.ZodEnum<{
        professional: "professional";
        casual: "casual";
        technical: "technical";
        friendly: "friendly";
    }>>;
    wordCount: z.ZodDefault<z.ZodNumber>;
    includeImages: z.ZodDefault<z.ZodBoolean>;
    eEatCompliance: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type ContentGenerationRequest = z.infer<typeof ContentGenerationRequestSchema>;
export type EEAtscore = {
    expertise: number;
    experience: number;
    authoritativeness: number;
    trustworthiness: number;
    overall: number;
};
interface GeneratedContentInternal {
    title: string;
    content: string;
    qualityScore: number;
}
interface GeneratedContentResponse extends GeneratedContentInternal {
    id: string;
    projectId: string;
    templateId?: string | null;
    contentType: ContentGenerationRequest['contentType'];
    keywords: string[];
    status: string;
    eEatScore: EEAtscore;
    generatedAt: string;
}
export declare class ContentGenerator {
    private openai;
    constructor();
    generateContent(request: ContentGenerationRequest): Promise<GeneratedContentResponse>;
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
        variables?: Record<string, unknown>;
    }): Promise<{
        name: string;
        type: string;
        qualityThreshold: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        template: string;
        variables: Record<string, unknown> | null;
        eEatScore: string | null;
    }>;
    getTemplates(type?: string): Promise<{
        id: string;
        name: string;
        type: string;
        template: string;
        variables: Record<string, unknown> | null;
        eEatScore: string | null;
        qualityThreshold: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getGeneratedContent(projectId: string, contentType?: string): Promise<{
        id: string;
        projectId: string;
        templateId: string | null;
        title: string;
        content: string;
        contentType: string;
        url: string | null;
        keywords: string[] | null;
        eEatScore: string | null;
        qualityScore: string | null;
        status: string;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
}
export declare const contentGenerator: ContentGenerator;
export {};
//# sourceMappingURL=contentGenerator.d.ts.map