import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import validation schemas from routes
// Note: These schemas are defined in route files, so we'll recreate them for testing
const ContentGenerationSchema = z.object({
  projectId: z.string().uuid(),
  contentType: z.enum(['landing_page', 'blog_post', 'service_page', 'product_page']),
  templateId: z.string().uuid().optional(),
  keywords: z.array(z.string()).min(1),
  targetAudience: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'technical', 'friendly']).default('professional'),
  wordCount: z.number().min(100).max(5000).default(1000),
  includeImages: z.boolean().default(true),
  eEatCompliance: z.boolean().default(true),
});

const SeoAnalysisSchema = z.object({
  projectId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(10),
  options: z.object({
    device: z.enum(['mobile', 'desktop']).default('desktop'),
    throttling: z.enum(['slow3G', 'fast3G', '4G', 'none']).default('4G'),
    categories: z.array(z.string()).default(['performance', 'accessibility', 'best-practices', 'seo']),
  }).optional(),
});

describe('Zod Validation Schemas - Branch Tests', () => {
  describe('ContentGenerationSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test', 'keyword'],
        tone: 'professional',
        wordCount: 1000,
        includeImages: true,
        eEatCompliance: true,
      };

      const result = ContentGenerationSchema.parse(validInput);
      expect(result).toBeDefined();
      expect(result.contentType).toBe('blog_post');
    });

    it('should reject invalid UUID for projectId', () => {
      const invalidInput = {
        projectId: 'invalid-uuid',
        contentType: 'blog_post',
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid contentType enum value', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'invalid_type',
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty keywords array', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: [],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject wordCount below minimum', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
        wordCount: 50, // Below minimum 100
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject wordCount above maximum', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
        wordCount: 6000, // Above maximum 5000
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should use default values for optional fields', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
      };

      const result = ContentGenerationSchema.parse(input);
      expect(result.tone).toBe('professional');
      expect(result.wordCount).toBe(1000);
      expect(result.includeImages).toBe(true);
      expect(result.eEatCompliance).toBe(true);
    });

    it('should accept optional templateId', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
        templateId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = ContentGenerationSchema.parse(input);
      expect(result.templateId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should reject invalid UUID for optional templateId', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
        templateId: 'invalid-uuid',
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should accept all contentType enum values', () => {
      const types = ['landing_page', 'blog_post', 'service_page', 'product_page'] as const;
      
      for (const type of types) {
        const input = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          contentType: type,
          keywords: ['test'],
        };

        const result = ContentGenerationSchema.parse(input);
        expect(result.contentType).toBe(type);
      }
    });

    it('should accept all tone enum values', () => {
      const tones = ['professional', 'casual', 'technical', 'friendly'] as const;
      
      for (const tone of tones) {
        const input = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          contentType: 'blog_post',
          keywords: ['test'],
          tone,
        };

        const result = ContentGenerationSchema.parse(input);
        expect(result.tone).toBe(tone);
      }
    });
  });

  describe('SeoAnalysisSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: ['https://example.com'],
      };

      const result = SeoAnalysisSchema.parse(validInput);
      expect(result).toBeDefined();
      expect(result.urls).toHaveLength(1);
    });

    it('should reject invalid URL format', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: ['not-a-valid-url'],
      };

      expect(() => SeoAnalysisSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty URLs array', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: [],
      };

      expect(() => SeoAnalysisSchema.parse(invalidInput)).toThrow();
    });

    it('should reject URLs array exceeding maximum', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: Array(11).fill('https://example.com'), // Exceeds max 10
      };

      expect(() => SeoAnalysisSchema.parse(invalidInput)).toThrow();
    });

    it('should use default values for options when provided', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: ['https://example.com'],
        options: {},
      };

      const result = SeoAnalysisSchema.parse(input);
      expect(result.options?.device).toBe('desktop');
      expect(result.options?.throttling).toBe('4G');
    });

    it('should accept valid device enum values', () => {
      const devices = ['mobile', 'desktop'] as const;
      
      for (const device of devices) {
        const input = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          urls: ['https://example.com'],
          options: { device },
        };

        const result = SeoAnalysisSchema.parse(input);
        expect(result.options?.device).toBe(device);
      }
    });

    it('should accept valid throttling enum values', () => {
      const throttlingOptions = ['slow3G', 'fast3G', '4G', 'none'] as const;
      
      for (const throttling of throttlingOptions) {
        const input = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          urls: ['https://example.com'],
          options: { throttling },
        };

        const result = SeoAnalysisSchema.parse(input);
        expect(result.options?.throttling).toBe(throttling);
      }
    });

    it('should reject invalid device enum value', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: ['https://example.com'],
        options: { device: 'invalid' },
      };

      expect(() => SeoAnalysisSchema.parse(invalidInput)).toThrow();
    });

    it('should reject invalid throttling enum value', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        urls: ['https://example.com'],
        options: { throttling: 'invalid' },
      };

      expect(() => SeoAnalysisSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Type Mismatch Validation', () => {
    it('should reject string for number field', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
        keywords: ['test'],
        wordCount: '1000', // String instead of number
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject number for string field', () => {
      const invalidInput = {
        projectId: 123, // Number instead of string UUID
        contentType: 'blog_post',
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject boolean for string field', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: true, // Boolean instead of enum
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Missing Required Fields', () => {
    it('should reject missing projectId', () => {
      const invalidInput = {
        contentType: 'blog_post',
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject missing contentType', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        keywords: ['test'],
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });

    it('should reject missing keywords', () => {
      const invalidInput = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        contentType: 'blog_post',
      };

      expect(() => ContentGenerationSchema.parse(invalidInput)).toThrow();
    });
  });
});

