import { z } from 'zod';
declare const configSchema: z.ZodObject<{
    port: z.ZodDefault<z.ZodNumber>;
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    apiVersion: z.ZodDefault<z.ZodString>;
    corsOrigin: z.ZodDefault<z.ZodString>;
    database: z.ZodObject<{
        url: z.ZodString;
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        name: z.ZodDefault<z.ZodString>;
        user: z.ZodDefault<z.ZodString>;
        password: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        url: string;
        host: string;
        name: string;
        user: string;
        password: string;
    }, {
        url: string;
        port?: number | undefined;
        host?: string | undefined;
        name?: string | undefined;
        user?: string | undefined;
        password?: string | undefined;
    }>;
    redis: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        password: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        url: string;
        host: string;
        password?: string | undefined;
    }, {
        port?: number | undefined;
        url?: string | undefined;
        host?: string | undefined;
        password?: string | undefined;
    }>;
    security: z.ZodObject<{
        jwtSecret: z.ZodString;
        jwtExpiresIn: z.ZodDefault<z.ZodString>;
        bcryptRounds: z.ZodDefault<z.ZodNumber>;
        rateLimitWindowMs: z.ZodDefault<z.ZodNumber>;
        rateLimitMaxRequests: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
    }, {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        bcryptRounds?: number | undefined;
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
    }>;
    apis: z.ZodObject<{
        openai: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey?: string | undefined;
        }, {
            apiKey?: string | undefined;
        }>;
        google: z.ZodObject<{
            searchConsoleApiKey: z.ZodOptional<z.ZodString>;
            businessApiKey: z.ZodOptional<z.ZodString>;
            mapsApiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            searchConsoleApiKey?: string | undefined;
            businessApiKey?: string | undefined;
            mapsApiKey?: string | undefined;
        }, {
            searchConsoleApiKey?: string | undefined;
            businessApiKey?: string | undefined;
            mapsApiKey?: string | undefined;
        }>;
        ahrefs: z.ZodObject<{
            apiKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            apiKey?: string | undefined;
        }, {
            apiKey?: string | undefined;
        }>;
        lighthouse: z.ZodObject<{
            ciToken: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            ciToken?: string | undefined;
        }, {
            ciToken?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>;
    monitoring: z.ZodObject<{
        prometheus: z.ZodDefault<z.ZodBoolean>;
        grafana: z.ZodDefault<z.ZodBoolean>;
        loki: z.ZodDefault<z.ZodBoolean>;
        tempo: z.ZodDefault<z.ZodBoolean>;
        openTelemetry: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        prometheus: boolean;
        grafana: boolean;
        loki: boolean;
        tempo: boolean;
        openTelemetry: boolean;
    }, {
        prometheus?: boolean | undefined;
        grafana?: boolean | undefined;
        loki?: boolean | undefined;
        tempo?: boolean | undefined;
        openTelemetry?: boolean | undefined;
    }>;
    kubernetes: z.ZodObject<{
        kubeconfigPath: z.ZodDefault<z.ZodString>;
        argocdServer: z.ZodOptional<z.ZodString>;
        argocdToken: z.ZodOptional<z.ZodString>;
        helmRepoUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        kubeconfigPath: string;
        argocdServer?: string | undefined;
        argocdToken?: string | undefined;
        helmRepoUrl?: string | undefined;
    }, {
        kubeconfigPath?: string | undefined;
        argocdServer?: string | undefined;
        argocdToken?: string | undefined;
        helmRepoUrl?: string | undefined;
    }>;
    compliance: z.ZodObject<{
        opa: z.ZodDefault<z.ZodBoolean>;
        kyverno: z.ZodDefault<z.ZodBoolean>;
        networkPolicy: z.ZodDefault<z.ZodBoolean>;
        externalSecrets: z.ZodDefault<z.ZodBoolean>;
        cosign: z.ZodDefault<z.ZodBoolean>;
        trivy: z.ZodDefault<z.ZodBoolean>;
        syft: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        opa: boolean;
        kyverno: boolean;
        networkPolicy: boolean;
        externalSecrets: boolean;
        cosign: boolean;
        trivy: boolean;
        syft: boolean;
    }, {
        opa?: boolean | undefined;
        kyverno?: boolean | undefined;
        networkPolicy?: boolean | undefined;
        externalSecrets?: boolean | undefined;
        cosign?: boolean | undefined;
        trivy?: boolean | undefined;
        syft?: boolean | undefined;
    }>;
    seo: z.ZodObject<{
        primaryKeywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        targetRegion: z.ZodDefault<z.ZodString>;
        targetDomainAuthority: z.ZodDefault<z.ZodNumber>;
        targetCtrIncrease: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        primaryKeywords: string[];
        targetRegion: string;
        targetDomainAuthority: number;
        targetCtrIncrease: number;
    }, {
        primaryKeywords?: string[] | undefined;
        targetRegion?: string | undefined;
        targetDomainAuthority?: number | undefined;
        targetCtrIncrease?: number | undefined;
    }>;
    content: z.ZodObject<{
        eEatEnabled: z.ZodDefault<z.ZodBoolean>;
        qualityThreshold: z.ZodDefault<z.ZodNumber>;
        landingPageTemplates: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        eEatEnabled: boolean;
        qualityThreshold: number;
        landingPageTemplates: number;
    }, {
        eEatEnabled?: boolean | undefined;
        qualityThreshold?: number | undefined;
        landingPageTemplates?: number | undefined;
    }>;
    linkBuilding: z.ZodObject<{
        minDrThreshold: z.ZodDefault<z.ZodNumber>;
        maxSpamScore: z.ZodDefault<z.ZodNumber>;
        backlinkTargets: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minDrThreshold: number;
        maxSpamScore: number;
        backlinkTargets: number;
    }, {
        minDrThreshold?: number | undefined;
        maxSpamScore?: number | undefined;
        backlinkTargets?: number | undefined;
    }>;
    sprint: z.ZodObject<{
        durationDays: z.ZodDefault<z.ZodNumber>;
        totalSprints: z.ZodDefault<z.ZodNumber>;
        visibilitySprint: z.ZodDefault<z.ZodNumber>;
        authoritySprint: z.ZodDefault<z.ZodNumber>;
        topRankSprint: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        durationDays: number;
        totalSprints: number;
        visibilitySprint: number;
        authoritySprint: number;
        topRankSprint: number;
    }, {
        durationDays?: number | undefined;
        totalSprints?: number | undefined;
        visibilitySprint?: number | undefined;
        authoritySprint?: number | undefined;
        topRankSprint?: number | undefined;
    }>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        format: z.ZodDefault<z.ZodEnum<["json", "simple"]>>;
        filePath: z.ZodDefault<z.ZodString>;
        maxSize: z.ZodDefault<z.ZodString>;
        maxFiles: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        level: "error" | "warn" | "info" | "debug";
        format: "json" | "simple";
        filePath: string;
        maxSize: string;
        maxFiles: number;
    }, {
        level?: "error" | "warn" | "info" | "debug" | undefined;
        format?: "json" | "simple" | undefined;
        filePath?: string | undefined;
        maxSize?: string | undefined;
        maxFiles?: number | undefined;
    }>;
    upload: z.ZodObject<{
        maxFileSize: z.ZodDefault<z.ZodNumber>;
        allowedFileTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        uploadPath: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        maxFileSize: number;
        allowedFileTypes: string[];
        uploadPath: string;
    }, {
        maxFileSize?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        uploadPath?: string | undefined;
    }>;
    email: z.ZodObject<{
        smtpHost: z.ZodDefault<z.ZodString>;
        smtpPort: z.ZodDefault<z.ZodNumber>;
        smtpUser: z.ZodOptional<z.ZodString>;
        smtpPass: z.ZodOptional<z.ZodString>;
        fromEmail: z.ZodDefault<z.ZodString>;
        fromName: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        smtpHost: string;
        smtpPort: number;
        fromEmail: string;
        fromName: string;
        smtpUser?: string | undefined;
        smtpPass?: string | undefined;
    }, {
        smtpHost?: string | undefined;
        smtpPort?: number | undefined;
        smtpUser?: string | undefined;
        smtpPass?: string | undefined;
        fromEmail?: string | undefined;
        fromName?: string | undefined;
    }>;
    sms: z.ZodObject<{
        accountSid: z.ZodOptional<z.ZodString>;
        authToken: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        accountSid?: string | undefined;
        authToken?: string | undefined;
        phoneNumber?: string | undefined;
    }, {
        accountSid?: string | undefined;
        authToken?: string | undefined;
        phoneNumber?: string | undefined;
    }>;
    payment: z.ZodObject<{
        stripeSecretKey: z.ZodOptional<z.ZodString>;
        stripePublishableKey: z.ZodOptional<z.ZodString>;
        stripeWebhookSecret: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        stripeSecretKey?: string | undefined;
        stripePublishableKey?: string | undefined;
        stripeWebhookSecret?: string | undefined;
    }, {
        stripeSecretKey?: string | undefined;
        stripePublishableKey?: string | undefined;
        stripeWebhookSecret?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    port: number;
    nodeEnv: "development" | "production" | "test";
    apiVersion: string;
    corsOrigin: string;
    database: {
        port: number;
        url: string;
        host: string;
        name: string;
        user: string;
        password: string;
    };
    redis: {
        port: number;
        url: string;
        host: string;
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
}, {
    database: {
        url: string;
        port?: number | undefined;
        host?: string | undefined;
        name?: string | undefined;
        user?: string | undefined;
        password?: string | undefined;
    };
    redis: {
        port?: number | undefined;
        url?: string | undefined;
        host?: string | undefined;
        password?: string | undefined;
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn?: string | undefined;
        bcryptRounds?: number | undefined;
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
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
        prometheus?: boolean | undefined;
        grafana?: boolean | undefined;
        loki?: boolean | undefined;
        tempo?: boolean | undefined;
        openTelemetry?: boolean | undefined;
    };
    kubernetes: {
        kubeconfigPath?: string | undefined;
        argocdServer?: string | undefined;
        argocdToken?: string | undefined;
        helmRepoUrl?: string | undefined;
    };
    compliance: {
        opa?: boolean | undefined;
        kyverno?: boolean | undefined;
        networkPolicy?: boolean | undefined;
        externalSecrets?: boolean | undefined;
        cosign?: boolean | undefined;
        trivy?: boolean | undefined;
        syft?: boolean | undefined;
    };
    seo: {
        primaryKeywords?: string[] | undefined;
        targetRegion?: string | undefined;
        targetDomainAuthority?: number | undefined;
        targetCtrIncrease?: number | undefined;
    };
    content: {
        eEatEnabled?: boolean | undefined;
        qualityThreshold?: number | undefined;
        landingPageTemplates?: number | undefined;
    };
    linkBuilding: {
        minDrThreshold?: number | undefined;
        maxSpamScore?: number | undefined;
        backlinkTargets?: number | undefined;
    };
    sprint: {
        durationDays?: number | undefined;
        totalSprints?: number | undefined;
        visibilitySprint?: number | undefined;
        authoritySprint?: number | undefined;
        topRankSprint?: number | undefined;
    };
    logging: {
        level?: "error" | "warn" | "info" | "debug" | undefined;
        format?: "json" | "simple" | undefined;
        filePath?: string | undefined;
        maxSize?: string | undefined;
        maxFiles?: number | undefined;
    };
    upload: {
        maxFileSize?: number | undefined;
        allowedFileTypes?: string[] | undefined;
        uploadPath?: string | undefined;
    };
    email: {
        smtpHost?: string | undefined;
        smtpPort?: number | undefined;
        smtpUser?: string | undefined;
        smtpPass?: string | undefined;
        fromEmail?: string | undefined;
        fromName?: string | undefined;
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
    port?: number | undefined;
    nodeEnv?: "development" | "production" | "test" | undefined;
    apiVersion?: string | undefined;
    corsOrigin?: string | undefined;
}>;
declare const config: {
    port: number;
    nodeEnv: "development" | "production" | "test";
    apiVersion: string;
    corsOrigin: string;
    database: {
        port: number;
        url: string;
        host: string;
        name: string;
        user: string;
        password: string;
    };
    redis: {
        port: number;
        url: string;
        host: string;
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
export type DatabaseConfig = Config['database'];
export type SecurityConfig = Config['security'];
export type SeoConfig = Config['seo'];
export type ContentConfig = Config['content'];
export type MonitoringConfig = Config['monitoring'];
//# sourceMappingURL=index.d.ts.map