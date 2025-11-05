/**
 * Type declarations for ws module
 * ws is a CommonJS module, so we need to declare it properly for ESM imports
 * This file is included in tsconfig.json via typeRoots
 */

// Global type augmentation for ws module
declare module 'ws' {
  import { EventEmitter } from 'events';
  import { Server as HTTPServer } from 'http';

  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;

    readyState: number;
    protocol: string;
    url: string;
    extensions: string;

    constructor(address: string | URL, protocols?: string | string[]);
    constructor(address: string | URL, protocols?: string | string[], options?: any);

    close(code?: number, reason?: string): void;
    ping(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    send(data: any, options: { mask?: boolean; binary?: boolean; compress?: boolean; fin?: boolean }, cb?: (err?: Error) => void): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'message', listener: (data: Buffer, isBinary: boolean) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping', listener: (data: Buffer) => void): this;
    on(event: 'pong', listener: (data: Buffer) => void): void;
    on(event: 'unexpected-response', listener: (request: any, response: any) => void): this;
    on(event: 'upgrade', listener: (response: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    server?: HTTPServer;
    verifyClient?: (info: { origin: string; secure: boolean; req: any }, callback: (res: boolean, code?: number, message?: string) => void) => void;
    handleProtocols?: (protocols: string[], request: any) => string | false;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | any;
    maxPayload?: number;
    skipUTF8Validation?: boolean;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: ServerOptions, callback?: () => void);

    clients: Set<WebSocket>;
    options: ServerOptions;

    close(cb?: (err?: Error) => void): void;
    handleUpgrade(request: any, socket: any, head: Buffer, callback: (ws: WebSocket, request: any) => void): void;

    on(event: 'connection', listener: (ws: WebSocket, request: any) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'headers', listener: (headers: string[], request: any) => void): this;
    on(event: 'listening', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

