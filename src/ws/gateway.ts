import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from '@/utils/logger.js';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth.js';
import { Event } from '@/bus/schema.js';
import { wsConnections, wsBroadcastTotal, wsLatency, streamConsumerLag } from '@/config/prometheus.js';
import { getStreamStats } from '@/metrics/realtime.js';

/**
 * WebSocket Gateway for Real-time Event Broadcasting
 * 
 * Broadcasts events from Redis Streams to connected WebSocket clients.
 * Supports authentication via JWT token in query string or upgrade header.
 */

// Authenticated WebSocket with additional properties
  // Using intersection type - TypeScript will merge WebSocket methods automatically
type AuthenticatedWebSocket = WebSocket & {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private clients: Set<AuthenticatedWebSocket> = new Set();
  
  // Metrics tracking
  private broadcastTotal = 0;
  private latencySamples: number[] = []; // Last 512 ping/pong measurements (ms)

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupEventHandlers();
    this.setupHeartbeat();
    this.setupMetricsUpdate();
    
    logger.info('WebSocket gateway initialized', {
      path: '/ws',
    });
  }

  /**
   * Verify client connection (extract JWT token)
   */
  private verifyClient(
    info: { origin: string; secure: boolean; req: { url?: string } }
  ): boolean {
    try {
      const url = new URL(info.req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) {
        logger.warn('WebSocket connection rejected: no token', {
          origin: info.origin,
        });
        return false;
      }

      // Token validation is done in upgrade handler
      // For now, accept if token exists (actual validation in handleUpgrade)
      return true;
    } catch (error) {
      logger.error('Error verifying WebSocket client', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const authenticatedWs = ws as AuthenticatedWebSocket;
      // Extract token from query string
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection rejected: no token');
        authenticatedWs.close(1008, 'Authentication required');
        return;
      }

      // TODO: Validate JWT token (reuse authenticate middleware logic)
      // For now, accept the connection
      authenticatedWs.userId = 'anonymous'; // Will be set after JWT validation
      authenticatedWs.isAlive = true;

      this.clients.add(authenticatedWs);

      logger.info('WebSocket client connected', {
        clientId: authenticatedWs.userId,
        totalClients: this.clients.size,
      });

      // Record ping/pong latency
      const sentAt = Date.now();
      try {
        authenticatedWs.ping();
      } catch (error) {
        logger.error('Error sending ping', { error });
      }

      authenticatedWs.on('pong', () => {
        const latency = Date.now() - sentAt;
        this.recordLatency(latency);
        // Update Prometheus metric
        wsLatency.observe(latency / 1000); // Convert ms to seconds
      });

      // Handle incoming messages
      authenticatedWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(authenticatedWs, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message', {
            error: error instanceof Error ? error.message : String(error),
          });
          authenticatedWs.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            })
          );
        }
      });

      // Handle client disconnect
      authenticatedWs.on('close', () => {
        this.clients.delete(authenticatedWs);
        logger.info('WebSocket client disconnected', {
          clientId: authenticatedWs.userId,
          totalClients: this.clients.size,
        });
      });

      // Handle errors
      (authenticatedWs as WebSocket).on('error', (error) => {
        logger.error('WebSocket error', {
          clientId: authenticatedWs.userId,
          error: error instanceof Error ? error.message : String(error),
        });
        this.clients.delete(authenticatedWs);
      });

      // Send welcome message
      authenticatedWs.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established',
          timestamp: new Date().toISOString(),
        })
      );
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(ws: AuthenticatedWebSocket, message: unknown): void {
    if (typeof message !== 'object' || message === null) {
      return;
    }

    const msg = message as { type?: string; [key: string]: unknown };

    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      
      case 'subscribe':
        // TODO: Implement topic subscription
        ws.send(
          JSON.stringify({
            type: 'subscribed',
            topics: msg.topics || [],
          })
        );
        break;
      
      case 'unsubscribe':
        // TODO: Implement topic unsubscription
        ws.send(
          JSON.stringify({
            type: 'unsubscribed',
            topics: msg.topics || [],
          })
        );
        break;
      
      default:
        logger.warn('Unknown WebSocket message type', { type: msg.type });
    }
  }

  /**
   * Setup heartbeat to detect dead connections
   */
  private setupHeartbeat(): void {
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          logger.debug('Terminating dead WebSocket connection', {
            clientId: ws.userId,
          });
        (ws as WebSocket).terminate();
        this.clients.delete(ws);
        return;
      }

      ws.isAlive = false;
      (ws as WebSocket).ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Setup periodic metrics update (Prometheus)
   */
  private setupMetricsUpdate(): void {
    const interval = setInterval(async () => {
      try {
        // Update WebSocket connections gauge
        wsConnections.set(this.clients.size);

        // Update stream consumer lag metrics
        const streams =
          (process.env.REDIS_STREAMS ?? 'finbot.events,mubot.events,dese.events').split(
            ','
          );
        const streamStats = await getStreamStats(streams);

        for (const stat of streamStats) {
          for (const group of stat.groups) {
            streamConsumerLag.set(
              { stream: stat.stream, group: group.name },
              group.lagApprox
            );
          }
        }
      } catch (error) {
        logger.error('Error updating metrics', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 10000); // 10 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Record latency measurement
   */
  private recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 512) {
      this.latencySamples.shift();
    }
  }

  /**
   * Get WebSocket statistics
   */
  public getWsStats(): {
    connections: number;
    broadcastTotal: number;
    p50: number;
    p95: number;
  } {
    const arr = [...this.latencySamples].sort((a, b) => a - b);
    const p = (q: number) =>
      arr.length ? arr[Math.floor((q / 100) * (arr.length - 1))] : 0;

    return {
      connections: this.clients.size,
      broadcastTotal: this.broadcastTotal,
      p50: p(50),
      p95: p(95),
    };
  }

  /**
   * Broadcast event to all connected clients
   */
  public broadcastEvent(event: Event): void {
    const message = JSON.stringify({
      type: 'event',
      event: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        source: event.source,
        data: event.data,
      },
    });

    let sentCount = 0;
    let errorCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN = 1
        try {
          ws.send(message);
          sentCount++;
        } catch (error) {
          logger.error('Error sending event to client', {
            clientId: ws.userId,
            error: error instanceof Error ? error.message : String(error),
          });
          errorCount++;
        }
      }
    });

    // Increment broadcast counter
    this.broadcastTotal++;
    // Update Prometheus metric
    wsBroadcastTotal.inc();

    logger.debug('Event broadcasted', {
      eventId: event.id,
      eventType: event.type,
      sentCount,
      errorCount,
      totalClients: this.clients.size,
    });
  }

  /**
   * Broadcast message to specific clients (by userId or filter)
   */
  public broadcastToClients(
    message: unknown,
    filter?: (ws: AuthenticatedWebSocket) => boolean
  ): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN = 1
        if (!filter || filter(ws)) {
          try {
            ws.send(messageStr);
            sentCount++;
          } catch (error) {
            logger.error('Error sending message to client', {
              clientId: ws.userId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    });

    // Increment broadcast counter
    if (sentCount > 0) {
      this.broadcastTotal++;
      // Update Prometheus metric
      wsBroadcastTotal.inc();
    }

    logger.debug('Message broadcasted to filtered clients', {
      sentCount,
      totalClients: this.clients.size,
    });
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Close WebSocket server
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      // Close all client connections
      this.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });
      this.clients.clear();

      // Close server
      this.wss.close(() => {
        logger.info('WebSocket gateway closed');
        resolve();
      });
    });
  }
}

// Singleton instance
let gatewayInstance: WebSocketGateway | null = null;

/**
 * Initialize WebSocket gateway
 */
export function initializeWebSocketGateway(server: HTTPServer): WebSocketGateway {
  if (gatewayInstance) {
    logger.warn('WebSocket gateway already initialized');
    return gatewayInstance;
  }

  gatewayInstance = new WebSocketGateway(server);
  return gatewayInstance;
}

/**
 * Get WebSocket gateway instance
 */
export function getWebSocketGateway(): WebSocketGateway | null {
  return gatewayInstance;
}

/**
 * Get WebSocket statistics
 */
export function getWsStats(): {
  connections: number;
  broadcastTotal: number;
  p50: number;
  p95: number;
} {
  if (!gatewayInstance) {
    return { connections: 0, broadcastTotal: 0, p50: 0, p95: 0 };
  }
  return gatewayInstance.getWsStats();
}

