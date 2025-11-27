/**
 * Base Vector DB Client
 * 
 * Base implementation with common functionality
 */

import { logger } from '@/utils/logger.js';
import type { IVectorClient } from '../vector-client.interface.js';
import type {
  VectorDocument,
  VectorSearchResult,
  MetadataFilter,
  IndexStats,
  VectorMetric,
  VectorDBError,
} from '../types.js';

/**
 * Base implementation with common error handling and retry logic
 */
export abstract class BaseVectorClient implements IVectorClient {
  protected readonly maxRetries: number;
  protected readonly timeout: number;

  constructor(maxRetries = 3, timeout = 30000) {
    this.maxRetries = maxRetries;
    this.timeout = timeout;
  }

  abstract createIndex(
    name: string,
    dimension: number,
    metric: VectorMetric,
  ): Promise<void>;

  abstract deleteIndex(name: string): Promise<void>;

  abstract listIndexes(): Promise<string[]>;

  abstract indexExists(name: string): Promise<boolean>;

  abstract getIndexStats(name: string): Promise<IndexStats>;

  abstract upsert(vectors: VectorDocument[]): Promise<void>;

  abstract search(
    queryVector: number[],
    topK: number,
    filter?: MetadataFilter,
  ): Promise<VectorSearchResult[]>;

  abstract update(
    id: string,
    vector?: number[],
    metadata?: Partial<VectorDocument['metadata']>,
  ): Promise<void>;

  abstract delete(ids: string[]): Promise<void>;

  abstract getById(id: string): Promise<VectorDocument | null>;

  abstract healthCheck(): Promise<boolean>;

  /**
   * Retry wrapper with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s delay

        if (attempt < this.maxRetries - 1) {
          logger.warn(
            `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms`,
            { error },
          );
          await this.sleep(delay);
        }
      }
    }

    logger.error(`${operationName} failed after ${this.maxRetries} attempts`, {
      error: lastError,
    });
    throw lastError;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate vector dimension
   */
  protected validateVector(vector: number[], expectedDimension: number): void {
    if (vector.length !== expectedDimension) {
      throw new VectorDBError(
        `Vector dimension mismatch: expected ${expectedDimension}, got ${vector.length}`,
        'INVALID_DIMENSION',
      );
    }
  }

  /**
   * Build metadata filter (provider-specific implementation)
   */
  protected abstract buildFilter(filter: MetadataFilter): unknown;
}

