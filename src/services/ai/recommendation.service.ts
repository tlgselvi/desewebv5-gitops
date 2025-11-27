/**
 * Recommendation Service
 * 
 * Content-based and collaborative filtering recommendations
 */

import { logger } from '@/utils/logger.js';
import { getEmbeddingService } from './embedding.service.js';
import { getVectorClient } from '@/services/vector/index.js';
import type { VectorSearchResult, MetadataFilter } from '@/services/vector/types.js';

/**
 * Recommendation request
 */
export interface RecommendationRequest {
  userId: string;
  organizationId: string;
  itemType: 'product' | 'contact' | 'deal' | 'invoice' | 'document';
  limit?: number;
  context?: Record<string, unknown>;
}

/**
 * Recommendation result
 */
export interface RecommendationResult {
  id: string;
  type: string;
  score: number;
  reason: string;
  metadata: Record<string, unknown>;
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  recommendations: RecommendationResult[];
  totalResults: number;
  algorithm: 'content-based' | 'collaborative' | 'hybrid';
}

/**
 * Recommendation Service
 */
export class RecommendationService {
  private readonly defaultLimit = 10;

  /**
   * Get recommendations
   */
  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResponse> {
    try {
      // For now, use content-based recommendations
      // TODO: Implement collaborative filtering and hybrid approach

      const contentBased = await this.getContentBasedRecommendations(request);

      return {
        recommendations: contentBased,
        totalResults: contentBased.length,
        algorithm: 'content-based',
      };
    } catch (error) {
      logger.error('Recommendation generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        itemType: request.itemType,
      });

      return {
        recommendations: [],
        totalResults: 0,
        algorithm: 'content-based',
      };
    }
  }

  /**
   * Content-based recommendations
   */
  private async getContentBasedRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    try {
      // Get user's recent interactions (simplified - in production, track user interactions)
      const userProfile = await this.buildUserProfile(request.userId, request.organizationId);

      if (!userProfile || userProfile.length === 0) {
        // Cold start: return popular items
        return this.getPopularItems(request);
      }

      // Generate embedding for user profile
      const embeddingService = getEmbeddingService();
      const profileText = userProfile.join(' ');
      const profileEmbedding = await embeddingService.embed(profileText);

      // Search for similar items
      const vectorClient = await getVectorClient();
      const limit = request.limit || this.defaultLimit;

      const filter: MetadataFilter = {
        organizationId: request.organizationId,
        type: request.itemType,
        ...request.context,
      };

      const searchResults = await vectorClient.search(profileEmbedding, limit * 2, filter);

      // Format recommendations
      return searchResults.slice(0, limit).map((result, index) => ({
        id: result.id,
        type: result.metadata.type || request.itemType,
        score: result.score,
        reason: this.generateReason(result, index),
        metadata: {
          source: result.metadata.source,
          sourceId: result.metadata.sourceId,
          ...result.metadata,
        },
      }));
    } catch (error) {
      logger.error('Content-based recommendation failed', { error });
      return [];
    }
  }

  /**
   * Build user profile from recent interactions
   */
  private async buildUserProfile(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    // TODO: Implement user interaction tracking
    // For now, return empty array (cold start)
    return [];
  }

  /**
   * Get popular items (cold start solution)
   */
  private async getPopularItems(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    try {
      // Search for items with high interaction (simplified)
      const vectorClient = await getVectorClient();
      const limit = request.limit || this.defaultLimit;

      // Use a generic query embedding (average of common terms)
      const embeddingService = getEmbeddingService();
      const genericQuery = `popular ${request.itemType} trending`;
      const queryEmbedding = await embeddingService.embed(genericQuery);

      const filter: MetadataFilter = {
        organizationId: request.organizationId,
        type: request.itemType,
      };

      const results = await vectorClient.search(queryEmbedding, limit, filter);

      return results.map((result, index) => ({
        id: result.id,
        type: result.metadata.type || request.itemType,
        score: result.score,
        reason: `Popular ${request.itemType} based on trending content`,
        metadata: {
          source: result.metadata.source,
          sourceId: result.metadata.sourceId,
          ...result.metadata,
        },
      }));
    } catch (error) {
      logger.error('Popular items recommendation failed', { error });
      return [];
    }
  }

  /**
   * Generate recommendation reason
   */
  private generateReason(result: VectorSearchResult, index: number): string {
    if (index === 0) {
      return 'Highly relevant to your interests';
    } else if (index < 3) {
      return 'Similar to items you viewed';
    } else {
      return 'Recommended based on similar content';
    }
  }

  /**
   * Get similar items
   */
  async getSimilarItems(
    itemId: string,
    organizationId: string,
    limit = 5,
  ): Promise<RecommendationResult[]> {
    try {
      const vectorClient = await getVectorClient();

      // Get the item
      const item = await vectorClient.getById(itemId);
      if (!item) {
        return [];
      }

      // Search for similar items
      const results = await vectorClient.search(item.embedding, limit + 1, {
        organizationId,
      });

      // Filter out the original item
      const similar = results.filter((r) => r.id !== itemId).slice(0, limit);

      return similar.map((result) => ({
        id: result.id,
        type: result.metadata.type || 'unknown',
        score: result.score,
        reason: 'Similar content',
        metadata: {
          source: result.metadata.source,
          sourceId: result.metadata.sourceId,
          ...result.metadata,
        },
      }));
    } catch (error) {
      logger.error('Similar items recommendation failed', { error });
      return [];
    }
  }
}

// Singleton instance
let recommendationServiceInstance: RecommendationService | null = null;

/**
 * Get recommendation service instance
 */
export function getRecommendationService(): RecommendationService {
  if (!recommendationServiceInstance) {
    recommendationServiceInstance = new RecommendationService();
  }
  return recommendationServiceInstance;
}

