import { Server } from 'http';
interface ShutdownOptions {
    timeout?: number;
    signals?: string[];
}
export declare function gracefulShutdown(server: Server, cleanup?: () => Promise<void> | void, options?: ShutdownOptions): void;
export {};
//# sourceMappingURL=gracefulShutdown.d.ts.map