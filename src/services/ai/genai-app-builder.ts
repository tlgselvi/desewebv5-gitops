import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import axios from 'axios';

/**
 * Google GenAI App Builder Service
 * 
 * This service integrates with Google Cloud Vertex AI Agent Builder (GenAI App Builder)
 * to provide conversational AI, document AI, and search capabilities.
 * 
 * Uses trial credits: ₺41,569.31 (valid until Oct 2026)
 * Project: ea-plan-seo-project
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  response: string;
  citations?: Array<{
    source: string;
    snippet: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface DocumentAnalysisResult {
  text: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  summary?: string;
}

interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
  relevanceScore: number;
}

export class GenAIAppBuilderService {
  private apiKey: string | null = null;
  private projectId: string;
  private location: string;
  private enabled: boolean;
  // Use Generative AI API endpoint for API key authentication
  // For Vertex AI (service account), use: https://aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.projectId = config.apis.google.projectId || 'ea-plan-seo-project';
    this.location = config.apis.google.location || 'us-central1';
    this.enabled = config.apis.google.genaiAppBuilder?.enabled || false;
    
    // Get API key from environment
    this.apiKey = process.env.GOOGLE_CLOUD_API_KEY || null;

    if (this.enabled && this.apiKey) {
      logger.info('GenAI App Builder service initialized', {
        projectId: this.projectId,
        location: this.location,
        hasApiKey: !!this.apiKey,
      });
    } else {
      if (!this.enabled) {
        logger.warn('GenAI App Builder is disabled');
      }
      if (!this.apiKey) {
        logger.warn('GOOGLE_CLOUD_API_KEY not configured');
      }
      this.enabled = false;
    }
  }

  /**
   * Chat with GenAI Agent (Conversational AI)
   * Uses Vertex AI API for intelligent conversations
   */
  async chat(
    messages: ChatMessage[],
    context?: Record<string, unknown>
  ): Promise<ChatResponse> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('GenAI App Builder is not enabled or API key not configured');
    }

    try {
      // Get last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Build prompt with context
      let prompt = lastMessage.content;
      if (context) {
        prompt = `Context:\n${JSON.stringify(context, null, 2)}\n\nUser: ${prompt}`;
      }

      // Use Gemini API via REST
      // Note: Using generateContent instead of streamGenerateContent for simpler handling
      // For streaming, use streamGenerateContent with responseType: 'stream'
      const model = 'gemini-1.5-flash'; // Fast and efficient model
      const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response
      let fullText = '';
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        fullText = response.data.candidates[0].content.parts[0].text;
      } else if (Array.isArray(response.data)) {
        // Handle array response (streaming chunks)
        for (const chunk of response.data) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            fullText += chunk.candidates[0].content.parts[0].text;
          }
        }
      }

      // Extract usage metadata safely
      let usageMetadata = undefined;
      if (Array.isArray(response.data) && response.data.length > 0) {
        usageMetadata = response.data[response.data.length - 1]?.usageMetadata;
      } else if (response.data?.usageMetadata) {
        usageMetadata = response.data.usageMetadata;
      }

      return {
        response: fullText,
        metadata: {
          model,
          projectId: this.projectId,
          usage: usageMetadata,
        },
      };
    } catch (error) {
      logger.error('GenAI App Builder chat failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze documents using Document AI
   */
  async analyzeDocument(
    documentContent: string | Buffer,
    mimeType: string = 'text/plain'
  ): Promise<DocumentAnalysisResult> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('GenAI App Builder is not enabled or API key not configured');
    }

    try {
      const model = 'gemini-1.5-flash';
      const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

      const prompt = `
Analyze the following document and extract:
1. Main text content
2. Key entities (people, organizations, dates, amounts, etc.)
3. A brief summary

Document:
${typeof documentContent === 'string' ? documentContent : documentContent.toString()}
`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response
      let fullText = '';
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        fullText = response.data.candidates[0].content.parts[0].text;
      } else if (Array.isArray(response.data)) {
        // Handle array response (streaming chunks)
        for (const chunk of response.data) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            fullText += chunk.candidates[0].content.parts[0].text;
          }
        }
      }

      return {
        text: fullText,
        entities: [],
        summary: fullText.substring(0, 200),
      };
    } catch (error) {
      logger.error('GenAI document analysis failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search using GenAI-powered search engine
   */
  async search(
    query: string,
    maxResults: number = 10
  ): Promise<SearchResult[]> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('GenAI App Builder is not enabled or API key not configured');
    }

    try {
      const searchEngineId = config.apis.google.genaiAppBuilder?.searchEngineId;
      if (!searchEngineId) {
        logger.warn('Search Engine ID not configured, using fallback');
        return this.fallbackSearch(query, maxResults);
      }

      // Use Vertex AI Search API
      // Note: This requires a configured search engine in GenAI App Builder
      // For now, we'll use a fallback implementation
      return this.fallbackSearch(query, maxResults);
    } catch (error) {
      logger.error('GenAI search failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackSearch(query, maxResults);
    }
  }

  /**
   * Generate financial insights using GenAI
   * Specifically for FinBot integration
   */
  async generateFinancialInsights(
    financialData: Record<string, unknown>
  ): Promise<string> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('GenAI App Builder is not enabled or API key not configured');
    }

    try {
      const model = 'gemini-1.5-flash';
      const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

      const prompt = `
You are a financial analyst AI. Analyze the following financial data and provide insights:

${JSON.stringify(financialData, null, 2)}

Provide:
1. Key trends
2. Potential risks
3. Recommendations
4. Forecast insights
`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response
      let fullText = '';
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        fullText = response.data.candidates[0].content.parts[0].text;
      } else if (Array.isArray(response.data)) {
        // Handle array response (streaming chunks)
        for (const chunk of response.data) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            fullText += chunk.candidates[0].content.parts[0].text;
          }
        }
      }

      return fullText;
    } catch (error) {
      logger.error('GenAI financial insights generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate accounting insights using GenAI
   * Specifically for MuBot integration
   */
  async generateAccountingInsights(
    accountingData: Record<string, unknown>
  ): Promise<string> {
    if (!this.enabled || !this.apiKey) {
      throw new Error('GenAI App Builder is not enabled or API key not configured');
    }

    try {
      const model = 'gemini-1.5-flash';
      const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

      const prompt = `
You are an accounting expert AI. Analyze the following accounting data and provide insights:

${JSON.stringify(accountingData, null, 2)}

Provide:
1. Accounting accuracy assessment
2. Reconciliation status
3. Compliance checks
4. Recommendations
`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response
      let fullText = '';
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        fullText = response.data.candidates[0].content.parts[0].text;
      } else if (Array.isArray(response.data)) {
        // Handle array response (streaming chunks)
        for (const chunk of response.data) {
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            fullText += chunk.candidates[0].content.parts[0].text;
          }
        }
      }

      return fullText;
    } catch (error) {
      logger.error('GenAI accounting insights generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if service is enabled and ready
   */
  isEnabled(): boolean {
    return this.enabled && this.apiKey !== null;
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    projectId: string;
    location: string;
    agentId?: string;
    dataStoreId?: string;
    searchEngineId?: string;
  } {
    const genaiConfig = config.apis.google.genaiAppBuilder;
    const status: {
      enabled: boolean;
      projectId: string;
      location: string;
      agentId?: string;
      dataStoreId?: string;
      searchEngineId?: string;
    } = {
      enabled: this.enabled,
      projectId: this.projectId,
      location: this.location,
    };
    if (genaiConfig?.agentId) {
      status.agentId = genaiConfig.agentId;
    }
    if (genaiConfig?.dataStoreId) {
      status.dataStoreId = genaiConfig.dataStoreId;
    }
    if (genaiConfig?.searchEngineId) {
      status.searchEngineId = genaiConfig.searchEngineId;
    }
    return status;
  }

  // Private helper methods

  private buildPromptFromMessages(
    messages: ChatMessage[],
    context?: Record<string, unknown>
  ): string {
    let prompt = '';

    if (context) {
      prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }

    prompt += 'Conversation:\n';
    for (const message of messages) {
      prompt += `${message.role}: ${message.content}\n`;
    }

    prompt += '\nassistant:';
    return prompt;
  }

  private fallbackSearch(query: string, maxResults: number): SearchResult[] {
    // Fallback search implementation
    // In production, this would use the configured search engine
    logger.warn('Using fallback search - search engine not configured');
    return [
      {
        title: 'Search Results',
        snippet: `Results for: ${query}`,
        relevanceScore: 0.5,
      },
    ];
  }
}

export const genAIAppBuilderService = new GenAIAppBuilderService();

