import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { logger } from "@/utils/logger.js";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { redis } from "@/services/storage/redisClient.js";

/**
 * WebSocket Gateway
 * Provides real-time communication for the application
 */

interface WebSocketClient extends WebSocket {
  userId?: string;
  email?: string;
  role?: string;
  subscriptions?: Set<string>;
  isAuthenticated?: boolean;
}

interface WebSocketMessage {
  type: string;
  topic?: string;
  payload?: any;
  token?: string;
  [key: string]: any;
}

let wss: WebSocketServer | null = null;
const clients = new Map<string, WebSocketClient>();
const topicSubscriptions = new Map<string, Set<string>>(); // topic -> Set of client IDs

/**
 * Validate JWT token from WebSocket connection
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
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn("WebSocket connection: Token expired", {
        error: error.message,
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn("WebSocket connection: Invalid token", {
        error: error.message,
      });
    } else {
      logger.error("WebSocket connection: Token validation error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * Send message to client
 */
function sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      logger.error("Error sending message to client", {
        error: error instanceof Error ? error.message : String(error),
        userId: client.userId,
      });
    }
  }
}

/**
 * Broadcast message to all clients subscribed to a topic
 */
function broadcastToTopic(topic: string, message: WebSocketMessage): void {
  const subscribers = topicSubscriptions.get(topic);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  let sentCount = 0;
  subscribers.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      sendToClient(client, message);
      sentCount++;
    }
  });

  logger.debug("Broadcasted message to topic", {
    topic,
    subscriberCount: subscribers.size,
    sentCount,
  });
}

/**
 * Handle client authentication
 */
function handleAuthentication(
  client: WebSocketClient,
  message: WebSocketMessage,
): void {
  const { token } = message;

  if (!token) {
    sendToClient(client, {
      type: "auth_error",
      error: "Token is required for authentication",
    });
    return;
  }

  const userInfo = validateJWTToken(token);

  if (!userInfo) {
    sendToClient(client, {
      type: "auth_error",
      error: "Invalid or expired token",
    });
    return;
  }

  // Authenticate client
  client.userId = userInfo.id;
  client.email = userInfo.email;
  client.role = userInfo.role;
  client.isAuthenticated = true;
  client.subscriptions = new Set();

  // Add client to clients map
  const clientId = `client-${userInfo.id}-${Date.now()}`;
  clients.set(clientId, client);

  logger.info("WebSocket client authenticated", {
    userId: userInfo.id,
    email: userInfo.email,
    role: userInfo.role,
    clientId,
  });

  sendToClient(client, {
    type: "auth_success",
    userId: userInfo.id,
    email: userInfo.email,
    role: userInfo.role,
  });
}

/**
 * Handle topic subscription
 */
function handleTopicSubscription(
  client: WebSocketClient,
  message: WebSocketMessage,
): void {
  if (!client.isAuthenticated) {
    sendToClient(client, {
      type: "error",
      error: "Authentication required",
    });
    return;
  }

  const { topic } = message;

  if (!topic || typeof topic !== "string") {
    sendToClient(client, {
      type: "error",
      error: "Topic is required and must be a string",
    });
    return;
  }

  // Validate topic format (alphanumeric, dots, dashes, underscores)
  if (!/^[a-zA-Z0-9._-]+$/.test(topic)) {
    sendToClient(client, {
      type: "error",
      error: "Invalid topic format",
    });
    return;
  }

  // Add subscription
  if (!client.subscriptions) {
    client.subscriptions = new Set();
  }

  client.subscriptions.add(topic);

  // Add to topic subscriptions map
  if (!topicSubscriptions.has(topic)) {
    topicSubscriptions.set(topic, new Set());
  }

  const clientId = Array.from(clients.entries()).find(
    ([_, c]) => c === client,
  )?.[0];

  if (clientId) {
    topicSubscriptions.get(topic)!.add(clientId);

    logger.info("Client subscribed to topic", {
      userId: client.userId,
      topic,
      clientId,
    });

    sendToClient(client, {
      type: "subscription_success",
      topic,
      message: "Successfully subscribed to topic",
    });
  } else {
    sendToClient(client, {
      type: "error",
      error: "Client ID not found",
    });
  }
}

/**
 * Handle topic unsubscription
 */
function handleTopicUnsubscription(
  client: WebSocketClient,
  message: WebSocketMessage,
): void {
  if (!client.isAuthenticated) {
    sendToClient(client, {
      type: "error",
      error: "Authentication required",
    });
    return;
  }

  const { topic } = message;

  if (!topic || typeof topic !== "string") {
    sendToClient(client, {
      type: "error",
      error: "Topic is required and must be a string",
    });
    return;
  }

  // Remove subscription
  if (client.subscriptions) {
    client.subscriptions.delete(topic);
  }

  // Remove from topic subscriptions map
  const clientId = Array.from(clients.entries()).find(
    ([_, c]) => c === client,
  )?.[0];

  if (clientId && topicSubscriptions.has(topic)) {
    topicSubscriptions.get(topic)!.delete(clientId);

    // Clean up empty topic
    if (topicSubscriptions.get(topic)!.size === 0) {
      topicSubscriptions.delete(topic);
    }

    logger.info("Client unsubscribed from topic", {
      userId: client.userId,
      topic,
      clientId,
    });

    sendToClient(client, {
      type: "unsubscription_success",
      topic,
      message: "Successfully unsubscribed from topic",
    });
  } else {
    sendToClient(client, {
      type: "error",
      error: "Not subscribed to this topic",
    });
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(client: WebSocketClient, data: RawData): void {
  try {
    const message: WebSocketMessage = JSON.parse(data.toString());

    logger.debug("WebSocket message received", {
      type: message.type,
      userId: client.userId,
    });

    switch (message.type) {
      case "auth":
        handleAuthentication(client, message);
        break;

      case "subscribe":
        handleTopicSubscription(client, message);
        break;

      case "unsubscribe":
        handleTopicUnsubscription(client, message);
        break;

      case "ping":
        sendToClient(client, { type: "pong" });
        break;

      default:
        logger.warn("Unknown WebSocket message type", {
          type: message.type,
          userId: client.userId,
        });
        sendToClient(client, {
          type: "error",
          error: `Unknown message type: ${message.type}`,
        });
    }
  } catch (error) {
    logger.error("Error handling WebSocket message", {
      error: error instanceof Error ? error.message : String(error),
      userId: client.userId,
    });
    sendToClient(client, {
      type: "error",
      error: "Failed to process message",
    });
  }
}

/**
 * Handle client connection
 */
function handleConnection(ws: WebSocketClient): void {
  logger.info("New WebSocket connection", {
    readyState: ws.readyState,
  });

  // Set default values
  ws.isAuthenticated = false;
  ws.subscriptions = new Set();

  // Send welcome message
  sendToClient(ws, {
    type: "welcome",
    message: "Connected to WebSocket gateway. Please authenticate.",
    requiresAuth: true,
  });

  // Handle messages
  ws.on("message", (data: RawData) => {
    handleMessage(ws, data);
  });

  // Handle connection close
  ws.on("close", () => {
    const clientId = Array.from(clients.entries()).find(
      ([_, c]) => c === ws,
    )?.[0];

    if (clientId) {
      // Remove from all topic subscriptions
      if (ws.subscriptions) {
        ws.subscriptions.forEach((topic) => {
          const subscribers = topicSubscriptions.get(topic);
          if (subscribers) {
            subscribers.delete(clientId);
            if (subscribers.size === 0) {
              topicSubscriptions.delete(topic);
            }
          }
        });
      }

      clients.delete(clientId);

      logger.info("WebSocket client disconnected", {
        userId: ws.userId,
        clientId,
      });
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    logger.error("WebSocket error", {
      error: error.message,
      userId: ws.userId,
    });
  });
}

/**
 * Initialize WebSocket gateway
 */
export function initializeWebSocketGateway(httpServer: HTTPServer): void {
  if (wss) {
    logger.warn("WebSocket gateway already initialized");
    return;
  }

  try {
    wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
    });

    wss.on("connection", handleConnection);

    logger.info("WebSocket gateway initialized", {
      path: "/ws",
    });
  } catch (error) {
    logger.error("Failed to initialize WebSocket gateway", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get WebSocket gateway instance
 */
export function getWebSocketGateway(): WebSocketServer | null {
  return wss;
}

/**
 * Publish message to a topic
 */
export function publishToTopic(topic: string, message: any): void {
  broadcastToTopic(topic, {
    type: "topic_message",
    topic,
    payload: message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get gateway statistics
 */
export function getGatewayStats(): {
  connectedClients: number;
  authenticatedClients: number;
  topics: number;
  totalSubscriptions: number;
} {
  const connectedClients = Array.from(clients.values()).filter(
    (c) => c.readyState === WebSocket.OPEN,
  ).length;

  const authenticatedClients = Array.from(clients.values()).filter(
    (c) => c.isAuthenticated && c.readyState === WebSocket.OPEN,
  ).length;

  const topics = topicSubscriptions.size;

  const totalSubscriptions = Array.from(topicSubscriptions.values()).reduce(
    (sum, subscribers) => sum + subscribers.size,
    0,
  );

  return {
    connectedClients,
    authenticatedClients,
    topics,
    totalSubscriptions,
  };
}

/**
 * Close WebSocket gateway
 */
export async function close(): Promise<void> {
  if (!wss) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    try {
      // Close all connections
      wss!.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, "Server shutting down");
        }
      });

      // Close server
      wss!.close(() => {
        logger.info("WebSocket gateway closed");
        wss = null;
        clients.clear();
        topicSubscriptions.clear();
        resolve();
      });
    } catch (error) {
      logger.error("Error closing WebSocket gateway", {
        error: error instanceof Error ? error.message : String(error),
      });
      reject(error);
    }
  });
}

