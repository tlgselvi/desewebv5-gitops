/**
 * Vector DB Client Interface
 * 
 * Abstract interface for vector database operations
 * Implementations: Pinecone, Weaviate, Qdrant, Chroma
 */

import type {
  VectorDocument,
  VectorSearchResult,
  MetadataFilter,
  IndexStats,
  VectorMetric,
} from './types.js';

/**
 * Vector DB Client Interface
 * 
 * All vector DB implementations must implement this interface
 */
export interface IVectorClient {
  /**
   * Create a new index
   * @param name Index name
   * @param dimension Vector dimension
   * @param metric Distance metric
   */
  createIndex(
    name: string,
    dimension: number,
    metric: VectorMetric,
  ): Promise<void>;

  /**
   * Delete an index
   * @param name Index name
   */
  deleteIndex(name: string): Promise<void>;

  /**
   * List all indexes
   */
  listIndexes(): Promise<string[]>;

  /**
   * Check if an index exists
   * @param name Index name
   */
  indexExists(name: string): Promise<boolean>;

  /**
   * Get index statistics
   * @param name Index name
   */
  getIndexStats(name: string): Promise<IndexStats>;

  /**
   * Upsert vectors (insert or update)
   * @param vectors Array of vector documents
   */
  upsert(vectors: VectorDocument[]): Promise<void>;

  /**
   * Search for similar vectors
   * @param queryVector Query vector
   * @param topK Number of results to return
   * @param filter Optional metadata filter
   */
  search(
    queryVector: number[],
    topK: number,
    filter?: MetadataFilter,
  ): Promise<VectorSearchResult[]>;

  /**
   * Update a vector
   * @param id Vector ID
   * @param vector Optional new vector
   * @param metadata Optional new metadata
   */
  update(
    id: string,
    vector?: number[],
    metadata?: Partial<VectorDocument['metadata']>,
  ): Promise<void>;

  /**
   * Delete vectors by IDs
   * @param ids Array of vector IDs
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Get a vector by ID
   * @param id Vector ID
   */
  getById(id: string): Promise<VectorDocument | null>;

  /**
   * Health check
   * @returns true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

