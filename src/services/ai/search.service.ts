/**
 * Search Service
 * 
 * Intelligent semantic search service with RAG integration
 * Provides natural language search capabilities
 */

import { logger } from '@/utils/logger.js';
import { getEmbeddingService } from './embedding.service.js';
import { getVectorClient } from '@/services/vector/index.js';
import { getRAGService } from './rag.service.js';
import type {
  VectorSearchResult,
  MetadataFilter,
} from '@/services/vector/types.js';

/**
 * Search request
 */
export interface SearchRequest {
  query: string;
  organizationId: string;
  topK?: number;
  filter?: MetadataFilter;
  useRAG?: boolean; // Use RAG for enhanced results
  minScore?: number; // Minimum similarity score
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  source: string;
  sourceType: string;
  metadata: Record<string, unknown>;
  snippet?: string; // Highlighted snippet
}

/**
 * Search response
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  latency: number;
  ragAnswer?: string; // If useRAG is true
  citations?: Array<{
    id: string;
    source: string;
    content: string;
  }>;
}

/**
 * Search Service
 */
export class SearchService {
  private readonly defaultTopK = 10;
  private readonly defaultMinScore = 0.5;

  /**
   * Perform semantic search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Normalize query
      const normalizedQuery = this.normalizeQuery(request.query);

      // Generate query embedding
      const embeddingService = getEmbeddingService();
      const queryEmbedding = await embeddingService.embed(normalizedQuery);

      // Search vector DB
      const vectorClient = await getVectorClient();
      const topK = request.topK || this.defaultTopK;
      const minScore = request.minScore || this.defaultMinScore;

      const searchFilter: MetadataFilter = {
        organizationId: request.organizationId,
        ...request.filter,
      };

      const vectorResults = await vectorClient.search(
        queryEmbedding,
        topK * 2, // Get more results for filtering
        searchFilter,
      );

      // Filter by minimum score
      const filteredResults = vectorResults.filter((r) => r.score >= minScore);

      // Rank and format results
      const rankedResults = this.rankResults(filteredResults, normalizedQuery);
      const formattedResults = rankedResults.slice(0, topK).map((result) =>
        this.formatSearchResult(result, normalizedQuery),
      );

      // If RAG is requested, get enhanced answer
      let ragAnswer: string | undefined;
      let citations: Array<{ id: string; source: string; content: string }> | undefined;

      if (request.useRAG && formattedResults.length > 0) {
        try {
          const ragService = getRAGService();
          const ragResponse = await ragService.query({
            query: normalizedQuery,
            organizationId: request.organizationId,
            topK: Math.min(5, formattedResults.length),
            filter: request.filter,
          });

          ragAnswer = ragResponse.answer;
          citations = ragResponse.citations;
        } catch (error) {
          logger.warn('RAG enhancement failed, returning basic search results', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const latency = Date.now() - startTime;

      logger.info('Search completed', {
        query: normalizedQuery,
        resultsCount: formattedResults.length,
        latency,
        useRAG: request.useRAG,
      });

      return {
        query: normalizedQuery,
        results: formattedResults,
        totalResults: formattedResults.length,
        latency,
        ragAnswer,
        citations,
      };
    } catch (error) {
      logger.error('Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query,
        organizationId: request.organizationId,
      });

      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Rank search results
   */
  private rankResults(
    results: VectorSearchResult[],
    query: string,
  ): VectorSearchResult[] {
    // Multi-factor ranking:
    // 1. Relevance score (from vector search)
    // 2. Recency boost (newer content gets slight boost)
    // 3. Content length (prefer medium-length content)

    return results
      .map((result) => {
        let score = result.score;

        // Recency boost (if createdAt is available)
        if (result.metadata.createdAt) {
          const daysSinceCreation =
            (Date.now() - new Date(result.metadata.createdAt).getTime()) /
            (1000 * 60 * 60 * 24);
          const recencyBoost = Math.max(0, 1 - daysSinceCreation / 365) * 0.1; // Max 10% boost
          score += recencyBoost;
        }

        // Content length boost (prefer 200-1000 character content)
        const contentLength = result.content.length;
        if (contentLength >= 200 && contentLength <= 1000) {
          score += 0.05; // 5% boost for optimal length
        } else if (contentLength < 100) {
          score -= 0.1; // Penalty for very short content
        }

        return { ...result, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Format search result
   */
  private formatSearchResult(
    result: VectorSearchResult,
    query: string,
  ): SearchResult {
    // Generate snippet (highlight query terms)
    const snippet = this.generateSnippet(result.content, query);

    return {
      id: result.id,
      content: result.content,
      score: result.score,
      source: result.metadata.sourceType || result.metadata.source || 'unknown',
      sourceType: result.metadata.type || 'unknown',
      metadata: {
        organizationId: result.metadata.organizationId,
        sourceId: result.metadata.sourceId,
        chunkIndex: result.metadata.chunkIndex,
        ...result.metadata,
      },
      snippet,
    };
  }

  /**
   * Generate highlighted snippet
   */
  private generateSnippet(content: string, query: string, maxLength = 200): string {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const lowerContent = content.toLowerCase();

    // Find first occurrence of any query term
    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < lowerContent.length; i++) {
      let score = 0;
      for (const term of queryTerms) {
        if (lowerContent.substring(i).startsWith(term)) {
          score += term.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // Extract snippet around best match
    if (bestIndex === -1) {
      // No match found, return beginning
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, bestIndex - maxLength / 2);
    const end = Math.min(content.length, bestIndex + maxLength / 2);
    let snippet = content.substring(start, end);

    // Highlight query terms
    for (const term of queryTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      snippet = snippet.replace(regex, '**$1**');
    }

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Search with filters
   */
  async searchWithFilters(
    query: string,
    organizationId: string,
    filters: {
      sourceType?: string;
      dateRange?: { from: string; to: string };
      tags?: string[];
    },
  ): Promise<SearchResponse> {
    const metadataFilter: MetadataFilter = {
      organizationId,
      sourceType: filters.sourceType,
      dateRange: filters.dateRange,
      tags: filters.tags,
    };

    return this.search({
      query,
      organizationId,
      filter: metadataFilter,
    });
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

/**
 * Get search service instance
 */
export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}

