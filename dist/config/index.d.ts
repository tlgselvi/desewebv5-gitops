import { z } from "zod";
declare const configSchema: z.ZodObject<{
    port: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    nodeEnv: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    apiVersion: z.ZodDefault<z.ZodString>;
    corsOrigin: z.ZodDefault<z.ZodString>;
    database: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        name: z.ZodDefault<z.ZodString>;
        user: z.ZodDefault<z.ZodString>;
        password: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    redis: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        password: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    security: z.ZodObject<{
        jwtSecret: z.ZodDefault<z.ZodString>;
        jwtExpiresIn: z.ZodDefault<z.ZodString>;
        bcryptRounds: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        rateLimitWindowMs: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        rateLimitMaxRequests: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    apis: z.ZodObject<{
        openai: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        google: z.ZodObject<{
            searchConsoleApiKey: z.ZodOptional<z.ZodString>;
            businessApiKey: z.ZodOptional<z.ZodString>;
            mapsApiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        ahrefs: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        lighthouse: z.ZodObject<{
            ciToken: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    monitoring: z.ZodObject<{
        prometheus: z.ZodDefault<z.ZodBoolean>;
        grafana: z.ZodDefault<z.ZodBoolean>;
        loki: z.ZodDefault<z.ZodBoolean>;
        tempo: z.ZodDefault<z.ZodBoolean>;
        openTelemetry: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    kubernetes: z.ZodObject<{
        kubeconfigPath: z.ZodDefault<z.ZodString>;
        argocdServer: z.ZodOptional<z.ZodString>;
        argocdToken: z.ZodOptional<z.ZodString>;
        helmRepoUrl: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    compliance: z.ZodObject<{
        opa: z.ZodDefault<z.ZodBoolean>;
        kyverno: z.ZodDefault<z.ZodBoolean>;
        networkPolicy: z.ZodDefault<z.ZodBoolean>;
        externalSecrets: z.ZodDefault<z.ZodBoolean>;
        cosign: z.ZodDefault<z.ZodBoolean>;
        trivy: z.ZodDefault<z.ZodBoolean>;
        syft: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    seo: z.ZodObject<{
        primaryKeywords: z.ZodDefault<z.ZodArray<z.ZodString>>;
        targetRegion: z.ZodDefault<z.ZodString>;
        targetDomainAuthority: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        targetCtrIncrease: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    content: z.ZodObject<{
        eEatEnabled: z.ZodDefault<z.ZodBoolean>;
        qualityThreshold: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        landingPageTemplates: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    linkBuilding: z.ZodObject<{
        minDrThreshold: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        maxSpamScore: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        backlinkTargets: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    sprint: z.ZodObject<{
        durationDays: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        totalSprints: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        visibilitySprint: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        authoritySprint: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        topRankSprint: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<{
            error: "error";
            warn: "warn";
            info: "info";
            debug: "debug";
        }>>;
        format: z.ZodDefault<z.ZodEnum<{
            json: "json";
            simple: "simple";
        }>>;
        filePath: z.ZodDefault<z.ZodString>;
        maxSize: z.ZodDefault<z.ZodString>;
        maxFiles: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
    upload: z.ZodObject<{
        maxFileSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        allowedFileTypes: z.ZodDefault<z.ZodArray<z.ZodString>>;
        uploadPath: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    email: z.ZodObject<{
        smtpHost: z.ZodDefault<z.ZodString>;
        smtpPort: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        smtpUser: z.ZodOptional<z.ZodString>;
        smtpPass: z.ZodOptional<z.ZodString>;
        fromEmail: z.ZodDefault<z.ZodString>;
        fromName: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    sms: z.ZodObject<{
        accountSid: z.ZodOptional<z.ZodString>;
        authToken: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    payment: z.ZodObject<{
        stripeSecretKey: z.ZodOptional<z.ZodString>;
        stripePublishableKey: z.ZodOptional<z.ZodString>;
        stripeWebhookSecret: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const config: {
    port: number;
    nodeEnv: "development" | "production" | "test";
    apiVersion: string;
    corsOrigin: string;
    database: {
        url: string;
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
    };
    redis: {
        url: string;
        host: string;
        port: number;
        password?: string | undefined;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
    };
    apis: {
        openai: {
            apiKey?: string | undefined;
        };
        google: {
            searchConsoleApiKey?: string | undefined;
            businessApiKey?: string | undefined;
            mapsApiKey?: string | undefined;
        };
        ahrefs: {
            apiKey?: string | undefined;
        };
        lighthouse: {
            ciToken?: string | undefined;
        };
    };
    monitoring: {
        prometheus: boolean;
        grafana: boolean;
        loki: boolean;
        tempo: boolean;
        openTelemetry: boolean;
    };
    kubernetes: {
        kubeconfigPath: string;
        argocdServer?: string | undefined;
        argocdToken?: string | undefined;
        helmRepoUrl?: string | undefined;
    };
    compliance: {
        opa: boolean;
        kyverno: boolean;
        networkPolicy: boolean;
        externalSecrets: boolean;
        cosign: boolean;
        trivy: boolean;
        syft: boolean;
    };
    seo: {
        primaryKeywords: string[];
        targetRegion: string;
        targetDomainAuthority: number;
        targetCtrIncrease: number;
    };
    content: {
        eEatEnabled: boolean;
        qualityThreshold: number;
        landingPageTemplates: number;
    };
    linkBuilding: {
        minDrThreshold: number;
        maxSpamScore: number;
        backlinkTargets: number;
    };
    sprint: {
        durationDays: number;
        totalSprints: number;
        visibilitySprint: number;
        authoritySprint: number;
        topRankSprint: number;
    };
    logging: {
        level: "error" | "warn" | "info" | "debug";
        format: "json" | "simple";
        filePath: string;
        maxSize: string;
        maxFiles: number;
    };
    upload: {
        maxFileSize: number;
        allowedFileTypes: string[];
        uploadPath: string;
    };
    email: {
        smtpHost: string;
        smtpPort: number;
        fromEmail: string;
        fromName: string;
        smtpUser?: string | undefined;
        smtpPass?: string | undefined;
    };
    sms: {
        accountSid?: string | undefined;
        authToken?: string | undefined;
        phoneNumber?: string | undefined;
    };
    payment: {
        stripeSecretKey?: string | undefined;
        stripePublishableKey?: string | undefined;
        stripeWebhookSecret?: string | undefined;
    };
};
export { config };
export type Config = z.infer<typeof configSchema>;
export type DatabaseConfig = Config["database"];
export type SecurityConfig = Config["security"];
export type SeoConfig = Config["seo"];
export type ContentConfig = Config["content"];
export type MonitoringConfig = Config["monitoring"];
//# sourceMappingURL=index.d.ts.map