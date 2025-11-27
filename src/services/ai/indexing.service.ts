/**
 * Indexing Service
 * 
 * Service for indexing content into vector database
 * Handles document chunking, metadata extraction, and vector indexing
 */

import { logger } from '@/utils/logger.js';
import { getEmbeddingService } from './embedding.service.js';
import { getVectorClient } from '@/services/vector/index.js';
import type {
  VectorDocument,
  VectorMetadata,
} from '@/services/vector/types.js';
import { db } from '@/db/index.js';
import { vectorIndexMetadata } from '@/db/schema/vector.js';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Indexing options
 */
export interface IndexingOptions {
  chunkSize?: number; // Tokens per chunk (default: 500)
  chunkOverlap?: number; // Overlap tokens (default: 50)
  organizationId: string;
  sourceType: 'database' | 'file' | 'api' | 'user_content';
  sourceId?: string;
  sourceTypeDetail?: string; // Table name, file path, etc.
  metadata?: Record<string, unknown>;
}

/**
 * Indexing result
 */
export interface IndexingResult {
  indexedCount: number;
  chunkCount: number;
  duration: number;
  errors: string[];
}

/**
 * Document chunk
 */
interface DocumentChunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Indexing Service
 */
export class IndexingService {
  private readonly defaultChunkSize = 500; // tokens
  private readonly defaultChunkOverlap = 50; // tokens
  private readonly maxChunkSize = 1000; // tokens

  /**
   * Index a single document
   */
  async indexDocument(
    content: string,
    options: IndexingOptions,
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error('Content cannot be empty');
      }

      if (!options.organizationId) {
        throw new Error('Organization ID is required');
      }

      // Chunk document
      const chunks = this.chunkDocument(content, {
        chunkSize: options.chunkSize || this.defaultChunkSize,
        chunkOverlap: options.chunkOverlap || this.defaultChunkOverlap,
      });

      logger.info('Document chunked', {
        totalChunks: chunks.length,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
      });

      // Generate embeddings for chunks
      const embeddingService = getEmbeddingService();
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddings = await embeddingService.embedBatch(chunkTexts);

      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`,
        );
      }

      // Create vector documents
      const vectorDocuments: VectorDocument[] = chunks.map((chunk, index) => {
        const metadata: VectorMetadata = {
          source: options.sourceType,
          type: options.sourceTypeDetail || options.sourceType,
          organizationId: options.organizationId,
          sourceId: options.sourceId,
          sourceType: options.sourceTypeDetail,
          chunkIndex: index,
          chunkCount: chunks.length,
          createdAt: new Date(),
          ...options.metadata,
        };

        return {
          id: this.generateVectorId(
            options.organizationId,
            options.sourceType,
            options.sourceId || '',
            index,
          ),
          content: chunk.content,
          embedding: embeddings[index],
          metadata,
        };
      });

      // Upsert to vector DB
      const vectorClient = await getVectorClient();
      await vectorClient.upsert(vectorDocuments);

      // Update index metadata
      await this.updateIndexMetadata(options, vectorDocuments.length);

      const duration = Date.now() - startTime;

      logger.info('Document indexed successfully', {
        chunks: vectorDocuments.length,
        duration,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
      });

      return {
        indexedCount: 1,
        chunkCount: vectorDocuments.length,
        duration,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      logger.error('Document indexing failed', {
        error: errorMessage,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
      });

      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Index multiple documents (batch)
   */
  async indexDocuments(
    contents: Array<{ content: string; sourceId?: string; metadata?: Record<string, unknown> }>,
    options: IndexingOptions,
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalChunks = 0;
    let successCount = 0;

    for (const doc of contents) {
      try {
        const result = await this.indexDocument(doc.content, {
          ...options,
          sourceId: doc.sourceId || options.sourceId,
          metadata: { ...options.metadata, ...doc.metadata },
        });

        totalChunks += result.chunkCount;
        successCount += result.indexedCount;
        errors.push(...result.errors);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Document ${doc.sourceId || 'unknown'}: ${errorMessage}`);
        logger.error('Batch indexing failed for document', {
          error: errorMessage,
          sourceId: doc.sourceId,
        });
      }
    }

    return {
      indexedCount: successCount,
      chunkCount: totalChunks,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Chunk document into smaller pieces
   */
  private chunkDocument(
    content: string,
    options: { chunkSize: number; chunkOverlap: number },
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap } = options;

    // Simple sentence-based chunking
    // TODO: Implement more sophisticated chunking (token-based, paragraph-based)
    const sentences = this.splitIntoSentences(content);
    const tokensPerSentence = this.estimateTokensPerSentence(sentences);

    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let startOffset = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = tokensPerSentence[i];

      // If adding this sentence would exceed chunk size, finalize current chunk
      if (
        currentTokenCount + sentenceTokens > chunkSize &&
        currentChunk.length > 0
      ) {
        const chunkContent = currentChunk.join(' ');
        chunks.push({
          content: chunkContent,
          index: chunkIndex++,
          startOffset,
          endOffset: startOffset + chunkContent.length,
        });

        // Start new chunk with overlap
        const chunkStartIndex = i - currentChunk.length;
        const overlapSentences = this.getOverlapSentences(
          currentChunk,
          chunkOverlap,
          tokensPerSentence,
          chunkStartIndex,
        );
        currentChunk = overlapSentences;
        currentTokenCount = overlapSentences.reduce(
          (sum, sentence, idx) => {
            const sentenceIdx = chunkStartIndex + (currentChunk.length - overlapSentences.length) + idx;
            return sum + (tokensPerSentence[sentenceIdx] || Math.ceil(sentence.length / 4));
          },
          0,
        );
        startOffset = chunks[chunks.length - 1].endOffset - overlapSentences.join(' ').length;
      }

      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join(' '),
        index: chunkIndex,
        startOffset,
        endOffset: startOffset + currentChunk.join(' ').length,
      });
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP libraries)
    return text
      .split(/([.!?]+[\s\n]+)/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());
  }

  /**
   * Estimate tokens per sentence (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokensPerSentence(sentences: string[]): number[] {
    return sentences.map((s) => Math.ceil(s.length / 4));
  }

  /**
   * Get overlap sentences for chunk continuity
   */
  private getOverlapSentences(
    sentences: string[],
    overlapTokens: number,
    tokensPerSentence: number[],
    startIndex: number,
  ): string[] {
    const overlap: string[] = [];
    let tokenCount = 0;

    // Start from the end of current chunk and work backwards
    for (let i = sentences.length - 1; i >= 0 && tokenCount < overlapTokens; i--) {
      const sentenceTokens = tokensPerSentence[startIndex + i] || Math.ceil(sentences[i].length / 4);
      if (tokenCount + sentenceTokens <= overlapTokens) {
        overlap.unshift(sentences[i]);
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }

    return overlap;
  }

  /**
   * Generate unique vector ID
   */
  private generateVectorId(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    chunkIndex: number,
  ): string {
    return `${organizationId}:${sourceType}:${sourceId}:${chunkIndex}`;
  }

  /**
   * Update index metadata in database
   */
  private async updateIndexMetadata(
    options: IndexingOptions,
    chunkCount: number,
  ): Promise<void> {
    try {
      // Check if metadata record exists
      const whereConditions = [
        eq(vectorIndexMetadata.organizationId, options.organizationId),
        eq(vectorIndexMetadata.sourceType, options.sourceType),
      ];

      if (options.sourceId) {
        whereConditions.push(eq(vectorIndexMetadata.sourceId, options.sourceId));
      } else {
        whereConditions.push(isNull(vectorIndexMetadata.sourceId));
      }

      const existing = await db
        .select()
        .from(vectorIndexMetadata)
        .where(and(...whereConditions))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(vectorIndexMetadata)
          .set({
            lastIndexedAt: new Date(),
            indexedCount: (existing[0].indexedCount || 0) + chunkCount,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(vectorIndexMetadata.id, existing[0].id));
      } else {
        // Create new record
        await db.insert(vectorIndexMetadata).values({
          organizationId: options.organizationId,
          indexName: 'dese-index', // TODO: Get from config
          sourceType: options.sourceType,
          sourceId: options.sourceId,
          lastIndexedAt: new Date(),
          indexedCount: chunkCount,
          status: 'active',
          config: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
        });
      }
    } catch (error) {
      logger.error('Failed to update index metadata', { error });
      // Don't throw - metadata update failure shouldn't break indexing
    }
  }

  /**
   * Delete indexed content
   */
  async deleteIndexedContent(
    organizationId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    try {
      const vectorClient = await getVectorClient();

      // Generate all possible vector IDs for this source
      // Note: This is a simplified approach. In production, you might want to
      // track chunk counts in metadata to know how many IDs to delete
      const maxChunks = 1000; // Reasonable upper limit
      const ids: string[] = [];

      for (let i = 0; i < maxChunks; i++) {
        ids.push(this.generateVectorId(organizationId, sourceType, sourceId, i));
      }

      // Delete from vector DB
      await vectorClient.delete(ids);

      // Update metadata
      const whereConditions = [
        eq(vectorIndexMetadata.organizationId, organizationId),
        eq(vectorIndexMetadata.sourceType, sourceType),
      ];

      if (sourceId) {
        whereConditions.push(eq(vectorIndexMetadata.sourceId, sourceId));
      } else {
        whereConditions.push(isNull(vectorIndexMetadata.sourceId));
      }

      await db
        .update(vectorIndexMetadata)
        .set({
          status: 'paused',
          indexedCount: 0,
          updatedAt: new Date(),
        })
        .where(and(...whereConditions));

      logger.info('Indexed content deleted', {
        organizationId,
        sourceType,
        sourceId,
      });
    } catch (error) {
      logger.error('Failed to delete indexed content', { error });
      throw error;
    }
  }

  /**
   * Re-index content (delete and re-index)
   */
  async reindexDocument(
    content: string,
    options: IndexingOptions,
  ): Promise<IndexingResult> {
    // Delete existing
    if (options.sourceId) {
      await this.deleteIndexedContent(
        options.organizationId,
        options.sourceType,
        options.sourceId,
      );
    }

    // Re-index
    return this.indexDocument(content, options);
  }
}

// Singleton instance
let indexingServiceInstance: IndexingService | null = null;

/**
 * Get indexing service instance
 */
export function getIndexingService(): IndexingService {
  if (!indexingServiceInstance) {
    indexingServiceInstance = new IndexingService();
  }
  return indexingServiceInstance;
}

