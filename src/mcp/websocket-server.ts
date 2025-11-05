import { WebSocketServer, WebSocket, RawData } from "ws";
import { Server as HTTPServer } from "http";
import { logger } from "@/utils/logger.js";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { redis } from "@/services/storage/redisClient.js";

/**
 * MCP WebSocket Server
 * Provides real-time context push and event streaming for MCP servers
 */

interface MCPWebSocketClient extends WebSocket {
  userId?: string;
  email?: string;
  role?: string;
  subscribedTopics?: Set<string>;
  mcpModule?: string;
  isAuthenticated?: boolean;
}

interface MCPWebSocketMessage {
  type: "subscribe" | "unsubscribe" | "query" | "context_update" | "event";
  module?: "finbot" | "mubot" | "dese" | "observability" | "all";
  topic?: string;
  payload?: any;
  token?: string;
  [key: string]: any;
}

interface MCPWebSocketServer {
  server: WebSocketServer;
  clients: Map<string, MCPWebSocketClient>;
  topicSubscriptions: Map<string, Set<string>>; // topic -> Set of client IDs
}

const mcpServers = new Map<string, MCPWebSocketServer>();
const moduleTopics = new Map<string, Set<string>>([
  ["finbot", new Set(["accounts", "transactions", "budgets", "analytics"])],
  ["mubot", new Set(["ingestion", "quality", "accounting"])],
  ["dese", new Set(["anomalies", "correlations", "alerts"])],
  ["observability", new Set(["metrics", "logs", "traces"])],
]);

/**
 * Validate JWT token
 */
function validateJWTToken(token: string): {
  id: string;
  email: string;
  role: string;
} | null {
  try {
    const decoded = jwt.verify(token, config.security.jwtSecret) as {
      id: string;
      email: string;
      role: string;
      iat?: number;
      exp?: number;
    };

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    logger.warn("MCP WebSocket: Invalid token", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Send message to client
 */
function sendToClient(client: MCPWebSocketClient, message: MCPWebSocketMessage): void {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      logger.error("Error sending message to MCP WebSocket client", {
        error: error instanceof Error ? error.message : String(error),
        userId: client.userId,
      });
    }
  }
}

/**
 * Broadcast message to all clients subscribed to a topic
 */
function broadcastToTopic(
  server: MCPWebSocketServer,
  topic: string,
  message: MCPWebSocketMessage
): void {
  const subscribers = server.topicSubscriptions.get(topic);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  let sentCount = 0;
  subscribers.forEach((clientId) => {
    const client = server.clients.get(clientId);
    if (client && client.isAuthenticated) {
      sendToClient(client, message);
      sentCount++;
    }
  });

  logger.debug("MCP WebSocket: Broadcasted to topic", {
    topic,
    sentCount,
    totalSubscribers: subscribers.size,
  });
}

/**
 * Initialize MCP WebSocket Server for a module
 */
export function initializeMCPWebSocket(
  module: string,
  httpServer: HTTPServer,
  port: number
): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: `/${module}/ws`,
  });

  const server: MCPWebSocketServer = {
    server: wss,
    clients: new Map(),
    topicSubscriptions: new Map(),
  };

  mcpServers.set(module, server);

  wss.on("connection", (ws: MCPWebSocketClient, req) => {
    const clientId = `${module}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    ws.subscribedTopics = new Set();
    ws.mcpModule = module;
    ws.isAuthenticated = false;

    server.clients.set(clientId, ws);

    logger.info("MCP WebSocket client connected", {
      module,
      clientId,
      ip: req.socket.remoteAddress,
    });

    // Send welcome message
    sendToClient(ws, {
      type: "event",
      module: module as any,
      payload: {
        message: "Connected to MCP WebSocket server",
        module,
        clientId,
      },
    });

    ws.on("message", async (data: RawData) => {
      try {
        const message: MCPWebSocketMessage = JSON.parse(data.toString());

        // Handle authentication
        if (message.type === "query" && message.token) {
          const user = validateJWTToken(message.token);
          if (user) {
            ws.userId = user.id;
            ws.email = user.email;
            ws.role = user.role;
            ws.isAuthenticated = true;

            sendToClient(ws, {
              type: "event",
              module: module as any,
              payload: {
                message: "Authentication successful",
                userId: user.id,
              },
            });
          } else {
            sendToClient(ws, {
              type: "event",
              module: module as any,
              payload: {
                error: "Authentication failed",
              },
            });
            ws.close();
            return;
          }
        }

        // Require authentication for other operations
        if (!ws.isAuthenticated && message.type !== "query") {
          sendToClient(ws, {
            type: "event",
            module: module as any,
            payload: {
              error: "Authentication required",
            },
          });
          return;
        }

        // Handle subscribe
        if (message.type === "subscribe" && message.topic) {
          const topic = `${module}:${message.topic}`;
          ws.subscribedTopics?.add(topic);

          if (!server.topicSubscriptions.has(topic)) {
            server.topicSubscriptions.set(topic, new Set());
          }
          server.topicSubscriptions.get(topic)?.add(clientId);

          sendToClient(ws, {
            type: "event",
            module: module as any,
            payload: {
              message: `Subscribed to topic: ${message.topic}`,
              topic: message.topic,
            },
          });

          logger.info("MCP WebSocket: Client subscribed", {
            module,
            clientId,
            topic: message.topic,
          });
        }

        // Handle unsubscribe
        if (message.type === "unsubscribe" && message.topic) {
          const topic = `${module}:${message.topic}`;
          ws.subscribedTopics?.delete(topic);
          server.topicSubscriptions.get(topic)?.delete(clientId);

          sendToClient(ws, {
            type: "event",
            module: module as any,
            payload: {
              message: `Unsubscribed from topic: ${message.topic}`,
              topic: message.topic,
            },
          });

          logger.info("MCP WebSocket: Client unsubscribed", {
            module,
            clientId,
            topic: message.topic,
          });
        }
      } catch (error) {
        logger.error("MCP WebSocket: Message handling error", {
          error: error instanceof Error ? error.message : String(error),
          module,
          clientId,
        });

        sendToClient(ws, {
          type: "event",
          module: module as any,
          payload: {
            error: "Invalid message format",
          },
        });
      }
    });

    ws.on("close", () => {
      // Remove from all topic subscriptions
      ws.subscribedTopics?.forEach((topic) => {
        server.topicSubscriptions.get(topic)?.delete(clientId);
      });

      server.clients.delete(clientId);

      logger.info("MCP WebSocket client disconnected", {
        module,
        clientId,
      });
    });

    ws.on("error", (error) => {
      logger.error("MCP WebSocket client error", {
        error: error.message,
        module,
        clientId,
      });
    });
  });

  logger.info(`MCP WebSocket Server initialized for ${module}`, {
    module,
    port,
    path: `/${module}/ws`,
  });

  return wss;
}

/**
 * Push context update to subscribed clients
 */
export async function pushContextUpdate(
  module: string,
  topic: string,
  context: any
): Promise<void> {
  const server = mcpServers.get(module);
  if (!server) {
    logger.warn("MCP WebSocket: Server not found for module", { module });
    return;
  }

  const fullTopic = `${module}:${topic}`;
  const message: MCPWebSocketMessage = {
    type: "context_update",
    module: module as any,
    topic,
    payload: {
      context,
      timestamp: new Date().toISOString(),
    },
  };

  broadcastToTopic(server, fullTopic, message);

  logger.debug("MCP WebSocket: Context update pushed", {
    module,
    topic,
    subscribers: server.topicSubscriptions.get(fullTopic)?.size || 0,
  });
}

/**
 * Push event to subscribed clients
 */
export async function pushEvent(
  module: string,
  topic: string,
  event: any
): Promise<void> {
  const server = mcpServers.get(module);
  if (!server) {
    logger.warn("MCP WebSocket: Server not found for module", { module });
    return;
  }

  const fullTopic = `${module}:${topic}`;
  const message: MCPWebSocketMessage = {
    type: "event",
    module: module as any,
    topic,
    payload: {
      event,
      timestamp: new Date().toISOString(),
    },
  };

  broadcastToTopic(server, fullTopic, message);

  logger.debug("MCP WebSocket: Event pushed", {
    module,
    topic,
    subscribers: server.topicSubscriptions.get(fullTopic)?.size || 0,
  });
}

/**
 * Get WebSocket server statistics
 */
export function getWebSocketStats(module: string): {
  connectedClients: number;
  topics: number;
  subscriptions: number;
} | null {
  const server = mcpServers.get(module);
  if (!server) {
    return null;
  }

  return {
    connectedClients: server.clients.size,
    topics: server.topicSubscriptions.size,
    subscriptions: Array.from(server.topicSubscriptions.values()).reduce(
      (sum, set) => sum + set.size,
      0
    ),
  };
}

