/**
 * Vector DB Client Factory
 * 
 * Factory pattern for creating vector DB client instances
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import type { IVectorClient } from './vector-client.interface.js';
import type { VectorDbProvider } from './types.js';

/**
 * Create a vector DB client instance based on configuration
 * 
 * @returns Vector DB client instance
 * @throws Error if provider is not configured or not supported
 */
export async function createVectorClient(): Promise<IVectorClient> {
  const provider = config.vectorDb.provider;

  if (!provider) {
    throw new Error(
      'Vector DB provider not configured. Set VECTOR_DB_PROVIDER environment variable.',
    );
  }

  logger.info(`Creating vector DB client for provider: ${provider}`);

  switch (provider) {
    case 'pinecone':
      return createPineconeClient();
    case 'weaviate':
      return createWeaviateClient();
    case 'qdrant':
      return createQdrantClient();
    case 'chroma':
      return createChromaClient();
    default:
      throw new Error(`Unsupported vector DB provider: ${provider}`);
  }
}

/**
 * Create Pinecone client
 */
async function createPineconeClient(): Promise<IVectorClient> {
  try {
    const { PineconeVectorClient } = await import('./providers/pinecone.client.js');
    return new PineconeVectorClient({
      apiKey: config.vectorDb.apiKey || '',
      environment: config.vectorDb.environment,
      indexName: config.vectorDb.indexName,
      dimension: config.vectorDb.dimension,
      metric: config.vectorDb.metric,
      timeout: config.vectorDb.timeout,
      maxRetries: config.vectorDb.maxRetries,
    });
  } catch (error) {
    logger.error('Failed to create Pinecone client', { error });
    throw new Error(
      `Failed to create Pinecone client: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Create Weaviate client
 */
async function createWeaviateClient(): Promise<IVectorClient> {
  try {
    const { WeaviateVectorClient } = await import('./providers/weaviate.client.js');
    return new WeaviateVectorClient({
      url: config.vectorDb.url || 'http://localhost:8080',
      apiKey: config.vectorDb.apiKey,
      indexName: config.vectorDb.indexName,
      dimension: config.vectorDb.dimension,
      timeout: config.vectorDb.timeout,
      maxRetries: config.vectorDb.maxRetries,
    });
  } catch (error) {
    logger.error('Failed to create Weaviate client', { error });
    throw new Error(
      `Failed to create Weaviate client: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Create Qdrant client
 */
async function createQdrantClient(): Promise<IVectorClient> {
  try {
    const { QdrantVectorClient } = await import('./providers/qdrant.client.js');
    return new QdrantVectorClient({
      url: config.vectorDb.url || 'http://localhost:6333',
      apiKey: config.vectorDb.apiKey,
      indexName: config.vectorDb.indexName,
      dimension: config.vectorDb.dimension,
      metric: config.vectorDb.metric,
      timeout: config.vectorDb.timeout,
      maxRetries: config.vectorDb.maxRetries,
    });
  } catch (error) {
    logger.error('Failed to create Qdrant client', { error });
    throw new Error(
      `Failed to create Qdrant client: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Create Chroma client
 */
async function createChromaClient(): Promise<IVectorClient> {
  try {
    const { ChromaVectorClient } = await import('./providers/chroma.client.js');
    return new ChromaVectorClient({
      url: config.vectorDb.url || 'http://localhost:8000',
      apiKey: config.vectorDb.apiKey,
      indexName: config.vectorDb.indexName,
      dimension: config.vectorDb.dimension,
      metric: config.vectorDb.metric,
      timeout: config.vectorDb.timeout,
      maxRetries: config.vectorDb.maxRetries,
    });
  } catch (error) {
    logger.error('Failed to create Chroma client', { error });
    throw new Error(
      `Failed to create Chroma client: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get singleton vector client instance
 */
let vectorClientInstance: IVectorClient | null = null;

export async function getVectorClient(): Promise<IVectorClient> {
  if (!vectorClientInstance) {
    vectorClientInstance = await createVectorClient();
  }
  return vectorClientInstance;
}

