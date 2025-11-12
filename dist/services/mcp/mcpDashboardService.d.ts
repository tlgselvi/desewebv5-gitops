export type ModuleName = "mubot" | "finbot" | "aiops" | "observability";
export type MetricChangeType = "increase" | "decrease" | "neutral";
export type MetricIconKey = "FileInput" | "Database" | "Repeat" | "Scale" | "Cpu" | "MemoryStick" | "AlertTriangle" | "Network" | "Server" | "LogIn" | "AlertCircle" | "Timer" | "Users" | "Clock";
export interface DashboardHealthCheck {
    serviceName: string;
    status: string;
    lastChecked: string;
}
export interface DashboardMetric {
    icon: MetricIconKey;
    title: string;
    value: string;
    change?: string;
    changeType?: MetricChangeType;
    footerText?: string;
}
export interface McpDashboardData {
    module: ModuleName;
    generatedAt: string;
    healthChecks: DashboardHealthCheck[];
    metrics: DashboardMetric[];
}
export declare const mcpDashboardService: {
    getDashboardData(moduleName: ModuleName): Promise<McpDashboardData>;
};
//# sourceMappingURL=mcpDashboardService.d.ts.map