/**
 * RAG Service
 * 
 * Retrieval-Augmented Generation service
 * Combines vector search with LLM generation for context-aware responses
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { getEmbeddingService } from './embedding.service.js';
import { getVectorClient } from '@/services/vector/index.js';
import type {
  VectorSearchResult,
  MetadataFilter,
} from '@/services/vector/types.js';

/**
 * RAG query request
 */
export interface RAGQueryRequest {
  query: string;
  organizationId: string;
  topK?: number;
  maxTokens?: number;
  temperature?: number;
  filter?: MetadataFilter;
  stream?: boolean;
}

/**
 * RAG query response
 */
export interface RAGQueryResponse {
  answer: string;
  citations: Array<{
    id: string;
    source: string;
    content: string;
    score: number;
  }>;
  confidence: number;
  latency: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

/**
 * RAG Service
 */
export class RAGService {
  private readonly maxContextTokens: number;
  private readonly defaultTopK: number;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor() {
    this.maxContextTokens = config.rag.maxContextTokens;
    this.defaultTopK = config.rag.topK;
    this.defaultTemperature = config.rag.temperature;
    this.defaultMaxTokens = 2000; // Default max output tokens

    logger.info('RAGService initialized', {
      maxContextTokens: this.maxContextTokens,
      defaultTopK: this.defaultTopK,
      llmProvider: config.rag.llmProvider,
      llmModel: config.rag.llmModel,
    });
  }

  /**
   * Process RAG query
   */
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    const startTime = Date.now();

    try {
      // 1. Normalize and preprocess query
      const normalizedQuery = this.normalizeQuery(request.query);

      // 2. Generate query embedding
      const embeddingService = getEmbeddingService();
      const queryEmbedding = await embeddingService.embed(normalizedQuery);

      // 3. Search for relevant context
      const vectorClient = await getVectorClient();
      const topK = request.topK || this.defaultTopK;

      const searchFilter: MetadataFilter = {
        organizationId: request.organizationId,
        ...request.filter,
      };

      const searchResults = await vectorClient.search(
        queryEmbedding,
        topK,
        searchFilter,
      );

      if (searchResults.length === 0) {
        logger.warn('No search results found for query', {
          query: normalizedQuery,
          organizationId: request.organizationId,
        });

        return {
          answer: 'I could not find relevant information to answer your question.',
          citations: [],
          confidence: 0,
          latency: Date.now() - startTime,
        };
      }

      // 4. Build context window
      const context = this.buildContext(searchResults, request.maxTokens || this.maxContextTokens);

      // 5. Generate response using LLM
      const response = await this.generateResponse(
        normalizedQuery,
        context,
        {
          temperature: request.temperature || this.defaultTemperature,
          maxTokens: request.maxTokens || this.defaultMaxTokens,
        },
      );

      // 6. Extract citations
      const citations = this.extractCitations(searchResults);

      // 7. Calculate confidence
      const confidence = this.calculateConfidence(searchResults);

      const latency = Date.now() - startTime;

      logger.info('RAG query completed', {
        queryLength: normalizedQuery.length,
        resultsCount: searchResults.length,
        contextLength: context.length,
        answerLength: response.answer.length,
        confidence,
        latency,
      });

      return {
        answer: response.answer,
        citations,
        confidence,
        latency,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      logger.error('RAG query failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query,
        organizationId: request.organizationId,
      });

      throw new Error(
        `RAG query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Normalize query
   */
  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
  }

  /**
   * Build context window from search results
   */
  private buildContext(results: VectorSearchResult[], maxTokens: number): string {
    const contextParts: string[] = [];
    let tokenCount = 0;

    for (const result of results) {
      const content = result.content;
      const estimatedTokens = this.estimateTokens(content);

      if (tokenCount + estimatedTokens > maxTokens) {
        break;
      }

      contextParts.push(`[Source: ${result.metadata.sourceType || result.metadata.source}]\n${content}`);
      tokenCount += estimatedTokens;
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Generate response using LLM
   */
  private async generateResponse(
    query: string,
    context: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<{ answer: string; tokensUsed?: { input: number; output: number } }> {
    const provider = config.rag.llmProvider;

    switch (provider) {
      case 'openai':
        return this.generateOpenAIResponse(query, context, options);
      case 'anthropic':
        return this.generateAnthropicResponse(query, context, options);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Generate response using OpenAI
   */
  private async generateOpenAIResponse(
    query: string,
    context: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<{ answer: string; tokensUsed?: { input: number; output: number } }> {
    if (!config.apis.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: config.apis.openai.apiKey,
      });

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query, context);

      const response = await openai.chat.completions.create({
        model: config.rag.llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });

      const answer = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      return {
        answer,
        tokensUsed: usage
          ? {
              input: usage.prompt_tokens,
              output: usage.completion_tokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error('OpenAI response generation failed', { error });
      throw new Error(
        `OpenAI response failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate response using Anthropic (placeholder)
   */
  private async generateAnthropicResponse(
    query: string,
    context: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<{ answer: string; tokensUsed?: { input: number; output: number } }> {
    // TODO: Implement Anthropic Claude integration
    throw new Error('Anthropic Claude not yet implemented');
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `You are a helpful AI assistant that answers questions based on the provided context.
Your answers should be accurate, concise, and based solely on the information in the context.
If the context doesn't contain enough information to answer the question, say so.
Always cite your sources when referencing specific information from the context.`;
  }

  /**
   * Build user prompt with query and context
   */
  private buildUserPrompt(query: string, context: string): string {
    return `Context:
${context}

Question: ${query}

Please provide a comprehensive answer based on the context above. If you reference specific information, mention the source.`;
  }

  /**
   * Extract citations from search results
   */
  private extractCitations(results: VectorSearchResult[]): Array<{
    id: string;
    source: string;
    content: string;
    score: number;
  }> {
    return results.map((result) => ({
      id: result.id,
      source: result.metadata.sourceType || result.metadata.source || 'unknown',
      content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
      score: result.score,
    }));
  }

  /**
   * Calculate confidence score based on search results
   */
  private calculateConfidence(results: VectorSearchResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    // Average score of top results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    // Normalize to 0-1 range (assuming cosine similarity scores are 0-1)
    // Adjust based on your vector DB's scoring method
    return Math.min(1, Math.max(0, avgScore));
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
let ragServiceInstance: RAGService | null = null;

/**
 * Get RAG service instance
 */
export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService();
  }
  return ragServiceInstance;
}

