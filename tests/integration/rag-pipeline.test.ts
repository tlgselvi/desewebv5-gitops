/**
 * RAG Pipeline Integration Tests
 * 
 * End-to-end tests for RAG pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getRAGService } from '@/services/ai/rag.service.js';
import { getEmbeddingService } from '@/services/ai/embedding.service.js';
import { getIndexingService } from '@/services/ai/indexing.service.js';
import { getVectorClient } from '@/services/vector/index.js';

describe('RAG Pipeline Integration', () => {
  const testOrganizationId = 'test-org-123';

  describe('End-to-end RAG flow', () => {
    it('should index document and retrieve via RAG', async () => {
      // This test requires vector DB to be configured
      // Skip if not configured
      try {
        const vectorClient = await getVectorClient();
        const health = await vectorClient.healthCheck();
        if (!health) {
          console.log('Vector DB not available, skipping integration test');
          return;
        }
      } catch (error) {
        console.log('Vector DB not configured, skipping integration test');
        return;
      }

      // 1. Index a test document
      const indexingService = getIndexingService();
      const testContent = 'DESE EA Plan is an enterprise ERP platform. It includes finance, CRM, inventory, and IoT modules.';

      const indexResult = await indexingService.indexDocument(testContent, {
        organizationId: testOrganizationId,
        sourceType: 'database',
        sourceId: 'test-doc-1',
        sourceTypeDetail: 'test',
      });

      expect(indexResult.indexedCount).toBeGreaterThan(0);
      expect(indexResult.chunkCount).toBeGreaterThan(0);

      // 2. Query via RAG
      const ragService = getRAGService();
      const ragResponse = await ragService.query({
        query: 'What is DESE EA Plan?',
        organizationId: testOrganizationId,
        topK: 5,
      });

      expect(ragResponse.answer).toBeTruthy();
      expect(ragResponse.citations.length).toBeGreaterThan(0);
      expect(ragResponse.confidence).toBeGreaterThan(0);

      // 3. Cleanup
      await indexingService.deleteIndexedContent(
        testOrganizationId,
        'database',
        'test-doc-1',
      );
    });
  });

  describe('Embedding generation', () => {
    it('should generate embeddings', async () => {
      const embeddingService = getEmbeddingService();
      const embedding = await embeddingService.embed('Test text');

      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBeGreaterThan(0);
      expect(embedding.length).toBe(embeddingService.getDimension());
    });

    it('should generate batch embeddings', async () => {
      const embeddingService = getEmbeddingService();
      const embeddings = await embeddingService.embedBatch([
        'Text 1',
        'Text 2',
        'Text 3',
      ]);

      expect(embeddings.length).toBe(3);
      embeddings.forEach((emb) => {
        expect(emb).toBeInstanceOf(Array);
        expect(emb.length).toBe(embeddingService.getDimension());
      });
    });
  });
});

