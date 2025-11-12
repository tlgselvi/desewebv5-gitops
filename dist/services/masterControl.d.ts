/**
 * EA Plan Master Control v6.8.1 - Self-Updating Orchestrator
 * Mode: Persistent Orchestrator + Rules-Compliant + Self-Updating
 */
export interface EnvironmentStatus {
    namespace: {
        exists: boolean;
        name: string;
    };
    rbac: {
        configured: boolean;
        details: string[];
    };
    argocd: {
        connected: boolean;
        server?: string;
        apps?: number;
    };
    prometheus: {
        running: boolean;
        url?: string;
    };
    grafana: {
        running: boolean;
        url?: string;
    };
    networkPolicy: {
        configured: boolean;
        count?: number;
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
}
export interface RulesCompliance {
    compliant: boolean;
    violations: Array<{
        rule: string;
        severity: "low" | "medium" | "high" | "critical";
        message: string;
        fix?: string;
    }>;
    lastChecked: string;
    securityPolicy?: {
        exists: boolean;
        valid: boolean;
        errors?: string[];
    };
}
type LensStatus = {
    installed: boolean;
    version?: string;
};
type RepoStatus = {
    connected: boolean;
    url?: string;
    branches?: string[];
};
type PipelineStatus = {
    healthy: boolean;
    lastRun?: string;
    status?: string;
};
type RegistryStatus = {
    accessible: boolean;
    url?: string;
    images?: number;
};
type LocalDockerStatus = {
    running: boolean;
    images?: number;
};
type SyncStatus = {
    status: "synced" | "out-of-sync" | "error";
    lastSync?: string;
    mismatches?: string[];
    error?: string;
};
export interface GitHubDockerStatus {
    github: {
        lens: LensStatus;
        repo: RepoStatus;
        pipeline: PipelineStatus;
    };
    docker: {
        registry: RegistryStatus;
        local: LocalDockerStatus;
    };
    sync: SyncStatus;
    error?: string;
}
export interface SelfUpdateStatus {
    analyzed: boolean;
    updates: Array<{
        type: "context" | "prompt" | "pipeline" | "rules" | "config" | "securityPolicy";
        priority: "low" | "medium" | "high" | "critical";
        description: string;
        applied: boolean;
    }>;
    lastUpdate: string;
    nextUpdate?: string;
}
type MetricsQueryResult = {
    name: string;
    value: number;
    timestamp: string;
};
type ObservabilityHealth = "healthy" | "unhealthy";
interface ObservabilityChecks {
    targets: {
        prometheus?: {
            connected: boolean;
            url?: string;
            metricsCollected: number;
            health: ObservabilityHealth;
            error?: string;
            verified: boolean;
        };
        grafana?: {
            connected: boolean;
            url?: string;
            dashboards: number;
            health: ObservabilityHealth;
            error?: string;
            verified: boolean;
        };
    };
    metrics: {
        requested: string[];
        available: string[];
        missing: string[];
    };
    health: {
        prometheus?: ObservabilityHealth;
        grafana?: ObservabilityHealth;
    };
    overall?: {
        verified: boolean;
        issues: string[];
    };
}
export interface MetricsCollectionStatus {
    prometheus: {
        connected: boolean;
        url?: string;
        metricsCollected: number;
        queries?: MetricsQueryResult[];
        error?: string;
    };
    grafana: {
        connected: boolean;
        url?: string;
        dashboards?: number;
        error?: string;
    };
    collectedAt: string;
    observabilityChecks?: ObservabilityChecks;
}
export interface ModelTrainingStatus {
    trained: boolean;
    modelType: "isolation-forest" | "prophet" | "isolation-forest-prophet";
    trainingStarted?: string;
    trainingCompleted?: string;
    accuracy?: number;
    samples?: number;
    features?: number;
    error?: string;
}
export interface PhaseUpdateStatus {
    phase: string;
    manifestsLoaded: number;
    servicesDeployed: Array<{
        name: string;
        status: "deployed" | "pending" | "failed";
        namespace?: string;
    }>;
    lastUpdated: string;
    error?: string;
}
export interface GitHubTagBuildStatus {
    tagCreated: boolean;
    tag?: string;
    dockerImageBuilt: boolean;
    image?: string;
    registry?: string;
    pushed?: boolean;
    error?: string;
}
export interface ArgoCDSyncStatus {
    synced: boolean;
    app?: string;
    revision?: string;
    status?: "Synced" | "OutOfSync" | "Unknown";
    health?: "Healthy" | "Degraded" | "Progressing" | "Suspended" | "Missing" | "Unknown";
    syncTime?: string;
    error?: string;
}
export interface WorkflowStep {
    step: "rule-verify" | "observe" | "aiops-tune" | "docura-sync" | "phase-update" | "github-tag-build" | "argocd-sync" | "observability-verify";
    action?: string;
    source?: string;
    policy?: string;
    targets?: string[];
    metrics?: string[];
    model?: string;
    dataset?: string;
    parameters?: Record<string, unknown>;
    docura_image?: string;
    seo_observer?: boolean;
    target_phase?: string;
    apply_manifests?: boolean;
    commit_changes?: boolean;
    version?: string;
    image_name?: string;
    registry?: string;
    argocd_app?: string;
    sync_timeout?: number;
}
export interface WorkflowExecutionRequest {
    workflow: WorkflowStep[];
    auto_commit?: boolean;
    self_update?: boolean;
    validation?: boolean;
    observability_check?: boolean;
    full_cycle?: boolean;
}
export interface WorkflowExecutionResult {
    success: boolean;
    steps: Array<{
        step: string;
        status: "completed" | "failed" | "skipped";
        result?: unknown;
        error?: string;
        duration?: number;
    }>;
    totalDuration: number;
    startedAt: string;
    completedAt: string;
    summary?: {
        phase?: string;
        status?: string;
        deployments?: number;
        healthScore?: number;
        tag?: string;
        selfUpdate?: string;
    };
}
export interface DeploymentStatus {
    phase: string;
    lastUpdated: string;
    services: {
        name: string;
        status: "running" | "pending" | "failed";
        replicas?: number;
        desiredReplicas?: number;
        namespace?: string;
    }[];
    healthScore: number;
}
export interface CEOReport {
    cevap: string;
    kanit: {
        schemas: Record<string, unknown>;
        metrics: Record<string, number>;
        evidence: string[];
    };
    sonrakiAdim: {
        action: string;
        priority: "low" | "medium" | "high" | "critical";
        estimatedTime?: string;
        dependencies?: string[];
    };
    timestamp: string;
    version: string;
}
/**
 * Master Control Service v6.6
 */
export declare class MasterControlService {
    private readonly namespaceMonitoring;
    private readonly namespaceWeb;
    private readonly version;
    /**
     * Step 1: Environment Verification
     */
    verifyEnvironment(): Promise<EnvironmentStatus>;
    /**
     * Step 1: Rule-Verify - Rules.yaml ve securityPolicy eşleşmesi
     */
    checkRulesCompliance(): Promise<RulesCompliance>;
    /**
     * Step 2.5: GitHub + Docker Sync
     */
    syncGitHubDocker(): Promise<GitHubDockerStatus>;
    /**
     * Step 2: Observe - Prometheus + Grafana metrik toplanması
     */
    collectMetrics(): Promise<MetricsCollectionStatus>;
    /**
     * Step 3: AIOps-Tune - Predictive maintenance modellerinin eğitilmesi
     */
    trainPredictiveModels(): Promise<ModelTrainingStatus>;
    /**
     * Step 4: Docura-Sync - Dokümantasyon + SEO Observer senkronizasyonu
     */
    syncDocura(): Promise<{
        docura: {
            synced: boolean;
            index?: string;
            build?: string;
            docs?: number;
        };
        seo: {
            synced: boolean;
            observer?: string;
            cronjob?: string;
            lastRun?: string;
        };
    }>;
    /**
     * Step 2 (New): GitHub Tag + Docker Image Build
     */
    createGitHubTagAndBuildDocker(version?: string, imageName?: string, registry?: string): Promise<GitHubTagBuildStatus>;
    /**
     * Step 3 (New): ArgoCD Sync → Deployment Phase 7
     */
    syncArgoCDApp(appName?: string, timeout?: number): Promise<ArgoCDSyncStatus>;
    /**
     * Step 4 (New): Observability Verification - Enhanced verification
     */
    verifyObservability(targets?: string[], metrics?: string[]): Promise<MetricsCollectionStatus & {
        verified: boolean;
        issues?: string[];
    }>;
    /**
     * Step 5: Phase-Update - Faz 7 manifestlerinin yüklenmesi
     */
    updatePhase7(): Promise<PhaseUpdateStatus>;
    /**
     * Step 3: AIOps + SEO Observer + Docura Sync (Legacy - kept for backward compatibility)
     */
    syncAIOpsSEO(): Promise<{
        aiops: {
            synced: boolean;
            model?: string;
            tuning?: boolean;
        };
        seo: {
            synced: boolean;
            observer?: string;
            cronjob?: string;
        };
        docura: {
            synced: boolean;
            index?: string;
            build?: string;
        };
    }>;
    /**
     * Step 4: Deployment Cycle Management
     */
    manageDeploymentCycle(): Promise<DeploymentStatus>;
    /**
     * Generate CEO MODE Report
     */
    generateCEOReport(command?: string): Promise<CEOReport>;
    /**
     * Step 6: Self-Update Cycle
     */
    performSelfUpdate(updates?: Array<{
        type: SelfUpdateStatus["updates"][number]["type"];
        description: string;
        content?: string;
    }>): Promise<SelfUpdateStatus>;
    /**
     * Execute Workflow - Sequential workflow execution
     */
    executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResult>;
    /**
     * Execute command (deploy, sync, update, etc.)
     */
    executeCommand(command: string, params?: Record<string, unknown>): Promise<CEOReport>;
}
export declare const masterControl: MasterControlService;
export {};
//# sourceMappingURL=masterControl.d.ts.map