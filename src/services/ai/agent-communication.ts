import { redis } from '@/services/storage/redisClient.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Communication Service
 * 
 * Bot'lar arası mesajlaşma protokolü.
 * Redis Streams kullanarak event-driven communication sağlar.
 */

export type AgentId = 'finbot' | 'mubot' | 'salesbot' | 'stockbot' | 'hrbot' | 'iotbot' | 'seobot' | 'servicebot' | 'aiopsbot' | 'procurementbot' | 'jarvis';

export type MessageType = 'query' | 'notification' | 'request' | 'response';

export interface AgentMessage {
  from: AgentId;
  to: AgentId | 'all';
  type: MessageType;
  data: Record<string, unknown>;
  timestamp: string;
  correlationId: string;
  messageId?: string;
}

interface MessageResponse {
  message: AgentMessage;
  streamId: string;
}

/**
 * Agent Communication Service
 */
export class AgentCommunication {
  private readonly streams: Record<AgentId, string> = {
    finbot: 'ai:finbot:messages',
    mubot: 'ai:mubot:messages',
    salesbot: 'ai:salesbot:messages',
    stockbot: 'ai:stockbot:messages',
    hrbot: 'ai:hrbot:messages',
    iotbot: 'ai:iotbot:messages',
    seobot: 'ai:seobot:messages',
    servicebot: 'ai:servicebot:messages',
    aiopsbot: 'ai:aiopsbot:messages',
    procurementbot: 'ai:procurementbot:messages',
    jarvis: 'ai:jarvis:messages',
  };

  /**
   * Send message to an agent
   */
  async sendMessage(message: AgentMessage): Promise<string> {
    try {
      // Generate message ID if not provided
      if (!message.messageId) {
        message.messageId = uuidv4();
      }

      // Ensure correlation ID exists
      if (!message.correlationId) {
        message.correlationId = uuidv4();
      }

      // Set timestamp
      message.timestamp = new Date().toISOString();

      // Determine target stream
      const targetStream = message.to === 'all' 
        ? this.streams.jarvis // Send to JARVIS for broadcasting
        : this.streams[message.to];

      if (!targetStream) {
        throw new Error(`Invalid agent ID: ${message.to}`);
      }

      // Add message to Redis Stream
      const streamId = await redis.xadd(
        targetStream,
        '*',
        'from', message.from,
        'to', message.to,
        'type', message.type,
        'data', JSON.stringify(message.data),
        'timestamp', message.timestamp,
        'correlationId', message.correlationId,
        'messageId', message.messageId || ''
      ) as string;

      logger.info('Agent message sent', {
        from: message.from,
        to: message.to,
        type: message.type,
        correlationId: message.correlationId,
        streamId,
      });

      return streamId;
    } catch (error) {
      logger.error('Failed to send agent message', {
        error: error instanceof Error ? error.message : String(error),
        message,
      });
      throw error;
    }
  }

  /**
   * Receive messages for an agent
   */
  async receiveMessages(agentId: AgentId, count: number = 10): Promise<AgentMessage[]> {
    try {
      const stream = this.streams[agentId];
      if (!stream) {
        throw new Error(`Invalid agent ID: ${agentId}`);
      }

      // Read messages from stream
      const messages = await redis.xread('STREAMS', stream, '0', 'COUNT', count.toString());

      if (!messages || messages.length === 0) {
        return [];
      }

      const parsedMessages: AgentMessage[] = [];

      // Parse Redis stream format
      for (const streamData of messages) {
        if (Array.isArray(streamData) && streamData.length >= 2) {
          const streamName = streamData[0] as string;
          const entries = streamData[1] as Array<[string, string[]]>;

          for (const [streamId, fields] of entries) {
            const message: Partial<AgentMessage> = {
              messageId: streamId,
            };

            // Parse fields (key-value pairs)
            for (let i = 0; i < fields.length; i += 2) {
              const key = fields[i] as string;
              const value = fields[i + 1] as string;

              switch (key) {
                case 'from':
                  message.from = value as AgentId;
                  break;
                case 'to':
                  message.to = value as AgentId | 'all';
                  break;
                case 'type':
                  message.type = value as MessageType;
                  break;
                case 'data':
                  try {
                    message.data = JSON.parse(value);
                  } catch {
                    message.data = {};
                  }
                  break;
                case 'timestamp':
                  message.timestamp = value;
                  break;
                case 'correlationId':
                  message.correlationId = value;
                  break;
              }
            }

            if (message.from && message.to && message.type) {
              parsedMessages.push(message as AgentMessage);
            }
          }
        }
      }

      return parsedMessages;
    } catch (error) {
      logger.error('Failed to receive agent messages', {
        error: error instanceof Error ? error.message : String(error),
        agentId,
      });
      return [];
    }
  }

  /**
   * Wait for response to a specific message
   */
  async waitForResponse(
    correlationId: string,
    timeout: number = 30000,
    agentId: AgentId = 'jarvis'
  ): Promise<AgentMessage | null> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    while (Date.now() - startTime < timeout) {
      const messages = await this.receiveMessages(agentId, 100);
      
      const response = messages.find(
        msg => msg.correlationId === correlationId && msg.type === 'response'
      );

      if (response) {
        return response;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.warn('Response timeout', { correlationId, timeout });
    return null;
  }

  /**
   * Send query and wait for response
   */
  async sendQuery(
    from: AgentId,
    to: AgentId,
    query: Record<string, unknown>,
    timeout: number = 30000
  ): Promise<AgentMessage | null> {
    const correlationId = uuidv4();

    const message: AgentMessage = {
      from,
      to,
      type: 'query',
      data: query,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    await this.sendMessage(message);
    return this.waitForResponse(correlationId, timeout, to);
  }

  /**
   * Send notification (fire and forget)
   */
  async sendNotification(
    from: AgentId,
    to: AgentId | 'all',
    notification: Record<string, unknown>
  ): Promise<string> {
    const message: AgentMessage = {
      from,
      to,
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
      correlationId: uuidv4(),
    };

    return this.sendMessage(message);
  }

  /**
   * Send request and wait for response
   */
  async sendRequest(
    from: AgentId,
    to: AgentId,
    request: Record<string, unknown>,
    timeout: number = 30000
  ): Promise<AgentMessage | null> {
    const correlationId = uuidv4();

    const message: AgentMessage = {
      from,
      to,
      type: 'request',
      data: request,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    await this.sendMessage(message);
    return this.waitForResponse(correlationId, timeout, to);
  }

  /**
   * Send response to a message
   */
  async sendResponse(
    from: AgentId,
    to: AgentId,
    correlationId: string,
    response: Record<string, unknown>
  ): Promise<string> {
    const message: AgentMessage = {
      from,
      to,
      type: 'response',
      data: response,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    return this.sendMessage(message);
  }

  /**
   * Get stream info for an agent
   */
  async getStreamInfo(agentId: AgentId): Promise<{
    stream: string;
    length: number;
    lastMessageId?: string;
  }> {
    try {
      const stream = this.streams[agentId];
      if (!stream) {
        throw new Error(`Invalid agent ID: ${agentId}`);
      }

      const length = await redis.xlen(stream);
      const lastMessages = await redis.xrevrange(stream, '+', '-', 'COUNT', 1);

      const result: {
        stream: string;
        length: number;
        lastMessageId?: string;
      } = {
        stream,
        length,
      };
      
      if (lastMessages.length > 0 && lastMessages[0] && lastMessages[0][0]) {
        result.lastMessageId = lastMessages[0][0] as string;
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to get stream info', {
        error: error instanceof Error ? error.message : String(error),
        agentId,
      });
      return {
        stream: this.streams[agentId] || '',
        length: 0,
      };
    }
  }

  /**
   * Get all agents stream info
   */
  async getAllStreamsInfo(): Promise<Record<AgentId, {
    stream: string;
    length: number;
    lastMessageId?: string;
  }>> {
    const agents: AgentId[] = ['finbot', 'mubot', 'salesbot', 'stockbot', 'hrbot', 'iotbot', 'seobot', 'servicebot', 'aiopsbot', 'jarvis'];
    const info: Record<string, {
      stream: string;
      length: number;
      lastMessageId?: string;
    }> = {};

    for (const agentId of agents) {
      const streamInfo = await this.getStreamInfo(agentId);
      if (streamInfo) {
        info[agentId] = streamInfo;
      }
    }

    return info as Record<AgentId, {
      stream: string;
      length: number;
      lastMessageId?: string;
    }>;
  }
}

// Singleton instance
export const agentCommunication = new AgentCommunication();

