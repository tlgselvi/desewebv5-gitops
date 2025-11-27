/**
 * Vector DB Types and Interfaces
 * 
 * Common types for vector database operations across different providers
 */

/**
 * Vector document with content, embedding, and metadata
 */
export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: VectorMetadata;
}

/**
 * Vector metadata structure
 */
export interface VectorMetadata {
  source: 'database' | 'file' | 'api' | 'user_content';
  type: string; // 'invoice', 'contact', 'product', 'document', etc.
  organizationId: string;
  sourceId?: string; // Original document/record ID
  sourceType?: string; // Table name or file path
  chunkIndex?: number; // For chunked documents
  chunkCount?: number; // Total chunks in document
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  language?: string;
  [key: string]: unknown; // Allow additional metadata fields
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: VectorMetadata;
}

/**
 * Metadata filter for vector search
 */
export interface MetadataFilter {
  sourceType?: string;
  organizationId?: string;
  type?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  [key: string]: unknown; // Allow additional filter fields
}

/**
 * Index statistics
 */
export interface IndexStats {
  name: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  vectorCount: number;
  indexSize?: number; // In bytes, if available
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Vector DB provider types
 */
export type VectorDbProvider = 'pinecone' | 'weaviate' | 'qdrant' | 'chroma';

/**
 * Vector DB metric types
 */
export type VectorMetric = 'cosine' | 'euclidean' | 'dot';

/**
 * Vector DB error types
 */
export class VectorDBError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly provider?: VectorDbProvider,
  ) {
    super(message);
    this.name = 'VectorDBError';
  }
}

export class IndexNotFoundError extends VectorDBError {
  constructor(indexName: string, provider?: VectorDbProvider) {
    super(`Index not found: ${indexName}`, 'INDEX_NOT_FOUND', provider);
    this.name = 'IndexNotFoundError';
  }
}

export class ConnectionError extends VectorDBError {
  constructor(message: string, provider?: VectorDbProvider) {
    super(message, 'CONNECTION_ERROR', provider);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends VectorDBError {
  constructor(message: string, provider?: VectorDbProvider) {
    super(message, 'QUERY_ERROR', provider);
    this.name = 'QueryError';
  }
}

