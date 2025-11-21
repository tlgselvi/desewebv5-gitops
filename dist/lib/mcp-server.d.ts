import { Application, Router } from "express";
import { Server as HttpServer } from "http";
type RegisterRoutesContext = {
    app: Application;
    router: Router;
    basePath: string;
    httpServer: HttpServer;
    moduleId: string;
    port: number;
};
export type McpServerConfig = {
    moduleId: string;
    port: number;
    registerRoutes: (context: RegisterRoutesContext) => void;
};
export type McpServerInstance = {
    app: Application;
    httpServer: HttpServer;
};
export declare const createMcpServer: (config: McpServerConfig) => McpServerInstance;
export {};
//# sourceMappingURL=mcp-server.d.ts.map