import { logger } from '@/utils/logger.js';
import { genAIAppBuilderService } from '../genai-app-builder.js';
import OpenAI from 'openai';

/**
 * SEOBot AI Agent
 * 
 * SEO analizi, içerik üretimi, keyword araştırması için AI desteği sağlar.
 * Google GenAI App Builder kullanır.
 */

interface SEOAnalysis {
  score: number; // 0-100
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }>;
  recommendations: string[];
  keywords: string[];
}

interface ContentGenerationRequest {
  type: 'blog_post' | 'landing_page' | 'service_page' | 'product_page';
  topic: string;
  keywords: string[];
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
  wordCount?: number;
}

interface ContentResult {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
  seoScore: number;
  suggestions: string[];
}

interface KeywordResearch {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  opportunity: 'high' | 'medium' | 'low';
  relatedKeywords: string[];
}

export class SEOBotAgent {
  private agentId = 'seobot';
  private useGenAI: boolean;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.useGenAI = genAIAppBuilderService.isEnabled();
    
    if (!this.useGenAI && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    logger.info('SEOBot AI Agent initialized', {
      agentId: this.agentId,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    });
  }

  /**
   * Analyze SEO for a URL or content
   */
  async analyzeSEO(urlOrContent: string, isUrl: boolean = false): Promise<SEOAnalysis> {
    try {
      const prompt = `
Sen SEOBot AI Agent'sın. SEO uzmanısın. ${isUrl ? 'URL' : 'İçerik'} analizi yap.

${isUrl ? `URL: ${urlOrContent}` : `İçerik: ${urlOrContent}`}

SEO analizi yap ve şu formatta JSON döndür:
{
  "score": 0-100,
  "issues": [
    {
      "type": "critical" | "warning" | "info",
      "message": "Sorun açıklaması",
      "recommendation": "Öneri"
    }
  ],
  "recommendations": ["Öneri 1", "Öneri 2"],
  "keywords": ["keyword1", "keyword2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as SEOAnalysis;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SEOBot AI Agent\'sın. SEO uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as SEOAnalysis;
        }
      }

      // Mock response
      return {
        score: 75,
        issues: [
          {
            type: 'warning',
            message: 'Meta description eksik',
            recommendation: 'Meta description ekleyin',
          },
        ],
        recommendations: ['Meta description ekleyin', 'Alt text\'leri kontrol edin'],
        keywords: [],
      };
    } catch (error) {
      logger.error('SEOBot Agent: analyzeSEO failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate SEO-optimized content
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentResult> {
    try {
      const prompt = `
Sen SEOBot AI Agent'sın. SEO-optimize içerik üret.

İstek:
- Tip: ${request.type}
- Konu: ${request.topic}
- Keywords: ${request.keywords.join(', ')}
- Hedef Kitle: ${request.targetAudience || 'Genel'}
- Ton: ${request.tone || 'professional'}
- Kelime Sayısı: ${request.wordCount || 1000}

SEO-optimize içerik üret ve şu formatta JSON döndür:
{
  "title": "Başlık",
  "content": "İçerik metni",
  "metaDescription": "Meta açıklama",
  "keywords": ["keyword1", "keyword2"],
  "seoScore": 0-100,
  "suggestions": ["Öneri 1", "Öneri 2"]
}
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ContentResult;
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SEOBot AI Agent\'sın. SEO-optimize içerik üretme uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as ContentResult;
        }
      }

      // Mock response
      return {
        title: request.topic,
        content: `${request.topic} hakkında içerik...`,
        metaDescription: `${request.topic} hakkında bilgi`,
        keywords: request.keywords,
        seoScore: 80,
        suggestions: ['İçeriği genişletin', 'Görsel ekleyin'],
      };
    } catch (error) {
      logger.error('SEOBot Agent: generateContent failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Research keywords
   */
  async researchKeywords(topic: string): Promise<KeywordResearch[]> {
    try {
      const prompt = `
Sen SEOBot AI Agent'sın. Keyword araştırması yap.

Konu: ${topic}

Keyword araştırması yap ve şu formatta JSON döndür:
[
  {
    "keyword": "keyword",
    "searchVolume": 0,
    "difficulty": 0-100,
    "opportunity": "high" | "medium" | "low",
    "relatedKeywords": ["keyword1", "keyword2"]
  }
]
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = response.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as KeywordResearch[];
        }
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SEOBot AI Agent\'sın. Keyword araştırması uzmanısın.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return Array.isArray(parsed) ? parsed : [parsed];
        }
      }

      // Mock response
      return [
        {
          keyword: topic,
          searchVolume: 1000,
          difficulty: 50,
          opportunity: 'medium' as const,
          relatedKeywords: [`${topic} nedir`, `${topic} fiyat`],
        },
      ];
    } catch (error) {
      logger.error('SEOBot Agent: researchKeywords failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Answer SEO questions
   */
  async answerSEOQuestion(question: string, context?: Record<string, unknown>): Promise<string> {
    try {
      const contextStr = context ? `\n\nBağlam: ${JSON.stringify(context, null, 2)}` : '';
      const prompt = `
Sen SEOBot AI Agent'sın. SEO konularında uzman bir asistansın.

Soru: ${question}${contextStr}

Türkçe olarak detaylı ve anlaşılır bir şekilde cevap ver.
`;

      if (this.useGenAI) {
        const response = await genAIAppBuilderService.chat([
          { role: 'user', content: prompt }
        ]);
        return response.response;
      }

      // Fallback
      if (this.openaiClient) {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Sen SEOBot AI Agent\'sın. SEO konularında uzman bir asistansın. Türkçe cevap ver.' },
            { role: 'user', content: prompt }
          ],
        });

        return completion.choices[0]?.message?.content || 'Cevap alınamadı.';
      }

      return 'SEOBot AI Agent şu anda kullanılamıyor.';
    } catch (error) {
      logger.error('SEOBot Agent: answerSEOQuestion failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus(): {
    agentId: string;
    enabled: boolean;
    useGenAI: boolean;
    hasOpenAI: boolean;
  } {
    return {
      agentId: this.agentId,
      enabled: true,
      useGenAI: this.useGenAI,
      hasOpenAI: !!this.openaiClient,
    };
  }
}

// Singleton instance
export const seoBotAgent = new SEOBotAgent();

