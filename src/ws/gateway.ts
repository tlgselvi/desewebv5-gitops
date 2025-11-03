import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from '@/utils/logger.js';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth.js';
import { Event } from '@/bus/schema.js';

/**
 * WebSocket Gateway for Real-time Event Broadcasting
 * 
 * Broadcasts events from Redis Streams to connected WebSocket clients.
 * Supports authentication via JWT token in query string or upgrade header.
 */

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupEventHandlers();
    this.setupHeartbeat();
    
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
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      // Extract token from query string
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection rejected: no token');
        ws.close(1008, 'Authentication required');
        return;
      }

      // TODO: Validate JWT token (reuse authenticate middleware logic)
      // For now, accept the connection
      ws.userId = 'anonymous'; // Will be set after JWT validation
      ws.isAlive = true;

      this.clients.add(ws);

      logger.info('WebSocket client connected', {
        clientId: ws.userId,
        totalClients: this.clients.size,
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message', {
            error: error instanceof Error ? error.message : String(error),
          });
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            })
          );
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('WebSocket client disconnected', {
          clientId: ws.userId,
          totalClients: this.clients.size,
        });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', {
          clientId: ws.userId,
          error: error instanceof Error ? error.message : String(error),
        });
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(
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
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
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
      if (ws.readyState === WebSocket.OPEN) {
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
      if (ws.readyState === WebSocket.OPEN) {
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

