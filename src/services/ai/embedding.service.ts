/**
 * Embedding Service
 * 
 * Service for generating text embeddings using various models
 * Supports OpenAI, Sentence Transformers, and custom models
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { cacheService } from '@/services/cache/cacheService.js';
import { createHash } from 'crypto';

/**
 * Embedding result
 */
export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
  cached: boolean;
}

/**
 * Embedding Service
 * 
 * Handles text embedding generation with caching support
 */
export class EmbeddingService {
  private readonly model: string;
  private readonly modelName: string;
  private readonly dimension: number;
  private readonly cacheEnabled: boolean;
  private readonly cacheTtl: number;

  constructor() {
    this.model = config.embedding.model;
    this.modelName = config.embedding.modelName;
    this.dimension = config.embedding.dimension;
    this.cacheEnabled = config.embedding.cacheEnabled;
    this.cacheTtl = config.embedding.cacheTtl;

    logger.info('EmbeddingService initialized', {
      model: this.model,
      modelName: this.modelName,
      dimension: this.dimension,
      cacheEnabled: this.cacheEnabled,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Normalize text
    const normalizedText = this.normalizeText(text);

    // Check cache
    if (this.cacheEnabled) {
      const cached = await this.getCachedEmbedding(normalizedText);
      if (cached) {
        logger.debug('Embedding cache hit', { textLength: text.length });
        return cached;
      }
    }

    // Generate embedding
    const embedding = await this.generateEmbedding(normalizedText);

    // Cache result
    if (this.cacheEnabled) {
      await this.cacheEmbedding(normalizedText, embedding);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Normalize texts
    const normalizedTexts = texts.map((text) => this.normalizeText(text));

    // Check cache for all texts
    const results: (number[] | null)[] = [];
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    if (this.cacheEnabled) {
      for (let i = 0; i < normalizedTexts.length; i++) {
        const cached = await this.getCachedEmbedding(normalizedTexts[i]);
        if (cached) {
          results[i] = cached;
        } else {
          results[i] = null;
          uncachedIndices.push(i);
          uncachedTexts.push(normalizedTexts[i]);
        }
      }
    } else {
      // No cache, all need to be generated
      for (let i = 0; i < normalizedTexts.length; i++) {
        results[i] = null;
        uncachedIndices.push(i);
        uncachedTexts.push(normalizedTexts[i]);
      }
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const embeddings = await this.generateEmbeddingsBatch(uncachedTexts);

      // Store results and cache
      for (let i = 0; i < uncachedIndices.length; i++) {
        const originalIndex = uncachedIndices[i];
        const embedding = embeddings[i];
        results[originalIndex] = embedding;

        // Cache result
        if (this.cacheEnabled) {
          await this.cacheEmbedding(uncachedTexts[i], embedding);
        }
      }
    }

    return results as number[][];
  }

  /**
   * Generate embedding using the configured model
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    switch (this.model) {
      case 'openai':
        return this.generateOpenAIEmbedding(text);
      case 'sentence-transformers':
        return this.generateSentenceTransformerEmbedding(text);
      case 'custom':
        return this.generateCustomEmbedding(text);
      default:
        throw new Error(`Unsupported embedding model: ${this.model}`);
    }
  }

  /**
   * Generate embeddings in batch
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    switch (this.model) {
      case 'openai':
        return this.generateOpenAIEmbeddingsBatch(texts);
      case 'sentence-transformers':
        return this.generateSentenceTransformerEmbeddingsBatch(texts);
      case 'custom':
        return this.generateCustomEmbeddingsBatch(texts);
      default:
        throw new Error(`Unsupported embedding model: ${this.model}`);
    }
  }

  /**
   * Generate OpenAI embedding
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!config.apis.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: config.apis.openai.apiKey,
      });

      const response = await openai.embeddings.create({
        model: this.modelName,
        input: text,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      // Validate dimension
      if (embedding.length !== this.dimension) {
        logger.warn('Embedding dimension mismatch', {
          expected: this.dimension,
          actual: embedding.length,
        });
      }

      return embedding;
    } catch (error) {
      logger.error('OpenAI embedding generation failed', { error });
      throw new Error(
        `OpenAI embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate OpenAI embeddings in batch
   */
  private async generateOpenAIEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (!config.apis.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: config.apis.openai.apiKey,
      });

      // OpenAI supports batch requests (up to 2048 inputs per request)
      const batchSize = 100; // Process in batches to avoid rate limits
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await openai.embeddings.create({
          model: this.modelName,
          input: batch,
        });

        const embeddings = response.data.map((item) => item.embedding);
        results.push(...embeddings);

        // Rate limiting: wait between batches
        if (i + batchSize < texts.length) {
          await this.sleep(100); // 100ms delay between batches
        }
      }

      return results;
    } catch (error) {
      logger.error('OpenAI batch embedding generation failed', { error });
      throw new Error(
        `OpenAI batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate Sentence Transformer embedding (placeholder)
   */
  private async generateSentenceTransformerEmbedding(text: string): Promise<number[]> {
    // TODO: Implement Sentence Transformers integration
    // This would require a local model server or Python service
    throw new Error('Sentence Transformers not yet implemented');
  }

  /**
   * Generate Sentence Transformer embeddings in batch (placeholder)
   */
  private async generateSentenceTransformerEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // TODO: Implement Sentence Transformers batch integration
    throw new Error('Sentence Transformers batch not yet implemented');
  }

  /**
   * Generate custom embedding (placeholder)
   */
  private async generateCustomEmbedding(text: string): Promise<number[]> {
    // TODO: Implement custom model integration
    throw new Error('Custom embedding model not yet implemented');
  }

  /**
   * Generate custom embeddings in batch (placeholder)
   */
  private async generateCustomEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // TODO: Implement custom model batch integration
    throw new Error('Custom embedding batch not yet implemented');
  }

  /**
   * Normalize text for consistent embedding
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase(); // Optional: lowercase for consistency
  }

  /**
   * Get cached embedding
   */
  private async getCachedEmbedding(text: string): Promise<number[] | null> {
    try {
      const cacheKey = this.getCacheKey(text);
      const cached = await cacheService.get<number[]>(cacheKey);
      return cached;
    } catch (error) {
      logger.warn('Cache retrieval failed', { error });
      return null;
    }
  }

  /**
   * Cache embedding
   */
  private async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(text);
      await cacheService.set(cacheKey, embedding, { ttl: this.cacheTtl });
    } catch (error) {
      logger.warn('Cache storage failed', { error });
      // Don't throw - caching is optional
    }
  }

  /**
   * Generate cache key from text
   */
  private getCacheKey(text: string): string {
    const hash = createHash('sha256')
      .update(`${this.model}:${this.modelName}:${text}`)
      .digest('hex');
    return `embedding:${hash}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.modelName;
  }
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

/**
 * Get embedding service instance
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}

