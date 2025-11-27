/**
 * Chat Service
 * 
 * Conversational AI interface with RAG integration
 * Manages conversation history and context
 */

import { logger } from '@/utils/logger.js';
import { getRAGService } from './rag.service.js';
import type { RAGQueryRequest, RAGQueryResponse } from './rag.service.js';
import { db } from '@/db/index.js';
import { chatHistory } from '@/db/schema/vector.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat message request
 */
export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
  organizationId: string;
  userId: string;
  context?: Record<string, unknown>;
}

/**
 * Chat message response
 */
export interface ChatMessageResponse {
  message: string;
  sessionId: string;
  citations?: Array<{
    id: string;
    source: string;
    content: string;
    score: number;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Chat Service
 */
export class ChatService {
  private readonly maxHistoryMessages = 10; // Keep last N messages for context
  private readonly maxContextTokens = 4000; // Context window for history

  /**
   * Send a chat message
   */
  async sendMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    try {
      // Get or create session ID
      const sessionId = request.sessionId || uuidv4();

      // Save user message to history
      await this.saveMessage({
        sessionId,
        organizationId: request.organizationId,
        userId: request.userId,
        role: 'user',
        message: request.message,
        metadata: request.context,
      });

      // Get conversation history for context
      const history = await this.getConversationHistory(
        sessionId,
        request.organizationId,
        request.userId,
      );

      // Build context from history
      const context = this.buildHistoryContext(history);

      // Query RAG service
      const ragService = getRAGService();
      const ragRequest: RAGQueryRequest = {
        query: request.message,
        organizationId: request.organizationId,
        topK: 5,
        temperature: 0.7,
        filter: request.context as any,
      };

      const ragResponse = await ragService.query(ragRequest);

      // Save assistant response to history
      await this.saveMessage({
        sessionId,
        organizationId: request.organizationId,
        userId: request.userId,
        role: 'assistant',
        message: ragResponse.answer,
        metadata: {
          citations: ragResponse.citations,
          confidence: ragResponse.confidence,
          latency: ragResponse.latency,
          ...request.context,
        },
      });

      return {
        message: ragResponse.answer,
        sessionId,
        citations: ragResponse.citations,
        metadata: {
          confidence: ragResponse.confidence,
          latency: ragResponse.latency,
        },
      };
    } catch (error) {
      logger.error('Chat message failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: request.sessionId,
        organizationId: request.organizationId,
      });

      throw new Error(
        `Chat message failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    sessionId: string,
    organizationId: string,
    userId: string,
    limit?: number,
  ): Promise<Array<{ role: string; message: string; createdAt: Date }>> {
    try {
      const messages = await db
        .select({
          role: chatHistory.role,
          message: chatHistory.message,
          createdAt: chatHistory.createdAt,
        })
        .from(chatHistory)
        .where(
          and(
            eq(chatHistory.sessionId, sessionId),
            eq(chatHistory.organizationId, organizationId),
            eq(chatHistory.userId, userId),
          ),
        )
        .orderBy(desc(chatHistory.createdAt))
        .limit(limit || this.maxHistoryMessages);

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Failed to get conversation history', { error });
      return [];
    }
  }

  /**
   * Delete conversation history
   */
  async deleteConversationHistory(
    sessionId: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await db
        .delete(chatHistory)
        .where(
          and(
            eq(chatHistory.sessionId, sessionId),
            eq(chatHistory.organizationId, organizationId),
            eq(chatHistory.userId, userId),
          ),
        );

      logger.info('Conversation history deleted', {
        sessionId,
        organizationId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete conversation history', { error });
      throw error;
    }
  }

  /**
   * List user's chat sessions
   */
  async listSessions(
    organizationId: string,
    userId: string,
  ): Promise<Array<{ sessionId: string; lastMessageAt: Date; messageCount: number }>> {
    try {
      // Get unique sessions with latest message time
      const sessions = await db
        .select({
          sessionId: chatHistory.sessionId,
          lastMessageAt: chatHistory.createdAt,
        })
        .from(chatHistory)
        .where(
          and(
            eq(chatHistory.organizationId, organizationId),
            eq(chatHistory.userId, userId),
          ),
        )
        .groupBy(chatHistory.sessionId, chatHistory.createdAt)
        .orderBy(desc(chatHistory.createdAt));

      // Get message counts per session
      const sessionMap = new Map<string, { lastMessageAt: Date; messageCount: number }>();

      for (const session of sessions) {
        const existing = sessionMap.get(session.sessionId);
        if (!existing || session.lastMessageAt > existing.lastMessageAt) {
          const count = await db
            .select()
            .from(chatHistory)
            .where(eq(chatHistory.sessionId, session.sessionId))
            .then((msgs) => msgs.length);

          sessionMap.set(session.sessionId, {
            lastMessageAt: session.lastMessageAt,
            messageCount: count,
          });
        }
      }

      return Array.from(sessionMap.entries()).map(([sessionId, data]) => ({
        sessionId,
        ...data,
      }));
    } catch (error) {
      logger.error('Failed to list chat sessions', { error });
      return [];
    }
  }

  /**
   * Save message to history
   */
  private async saveMessage(data: {
    sessionId: string;
    organizationId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db.insert(chatHistory).values({
        sessionId: data.sessionId,
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
        message: data.message,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      });
    } catch (error) {
      logger.error('Failed to save chat message', { error });
      // Don't throw - history saving failure shouldn't break chat
    }
  }

  /**
   * Build context from conversation history
   */
  private buildHistoryContext(
    history: Array<{ role: string; message: string }>,
  ): string {
    if (history.length === 0) {
      return '';
    }

    const contextParts: string[] = [];
    let tokenCount = 0;

    // Include recent messages in reverse order (oldest first)
    for (const msg of history) {
      const estimatedTokens = Math.ceil(msg.message.length / 4);
      if (tokenCount + estimatedTokens > this.maxContextTokens) {
        break;
      }

      contextParts.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.message}`);
      tokenCount += estimatedTokens;
    }

    return contextParts.join('\n\n');
  }
}

// Singleton instance
let chatServiceInstance: ChatService | null = null;

/**
 * Get chat service instance
 */
export function getChatService(): ChatService {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  return chatServiceInstance;
}

