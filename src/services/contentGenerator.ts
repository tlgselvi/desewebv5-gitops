import OpenAI from 'openai';
import { z } from 'zod';
import { db, contentTemplates, generatedContent, seoProjects } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { logger, contentLogger } from '@/utils/logger.js';
import { recordContentGeneration } from '@/middleware/prometheus.js';
import { config } from '@/config/index.js';

// Validation schemas
const ContentGenerationRequestSchema = z.object({
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

const EEAtscoreSchema = z.object({
  expertise: z.number().min(0).max(1),
  experience: z.number().min(0).max(1),
  authoritativeness: z.number().min(0).max(1),
  trustworthiness: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
});

export type ContentGenerationRequest = z.infer<typeof ContentGenerationRequestSchema>;
export type EEAtscore = z.infer<typeof EEAtscoreSchema>;

export class ContentGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.apis.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apis.openai.apiKey,
      });
    }
  }

  async generateContent(request: ContentGenerationRequest): Promise<any> {
    // Validate request
    const validatedRequest = ContentGenerationRequestSchema.parse(request);

    // Verify project exists
    const project = await db
      .select()
      .from(seoProjects)
      .where(eq(seoProjects.id, validatedRequest.projectId))
      .limit(1);

    if (project.length === 0) {
      throw new Error('Project not found');
    }

    contentLogger.info('Starting content generation', {
      projectId: validatedRequest.projectId,
      contentType: validatedRequest.contentType,
      keywords: validatedRequest.keywords,
    });

    // Record metrics
    recordContentGeneration(validatedRequest.projectId, validatedRequest.contentType);

    try {
      let content: any;

      if (validatedRequest.templateId) {
        // Use existing template
        content = await this.generateFromTemplate(validatedRequest);
      } else {
        // Generate from scratch
        content = await this.generateFromScratch(validatedRequest);
      }

      // Calculate E-E-A-T score
      const eEatScore = await this.calculateEEATScore(content, validatedRequest);

      // Save generated content
      const savedContent = await (db.insert(generatedContent).values({
        projectId: validatedRequest.projectId,
        templateId: validatedRequest.templateId,
        title: content.title,
        content: content.content,
        contentType: validatedRequest.contentType,
        keywords: validatedRequest.keywords,
        eEatScore: eEatScore.overall,
        qualityScore: content.qualityScore,
        status: 'draft',
      } as any) as any).returning();

      contentLogger.info('Content generation completed', {
        contentId: savedContent[0].id,
        eEatScore: eEatScore.overall,
        qualityScore: content.qualityScore,
      });

      return {
        id: savedContent[0].id,
        ...content,
        eEatScore,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      contentLogger.error('Content generation failed', { error });
      throw error;
    }
  }

  private async generateFromTemplate(request: ContentGenerationRequest): Promise<any> {
    const template = await db
      .select()
      .from(contentTemplates)
      .where(eq(contentTemplates.id, request.templateId!))
      .limit(1);

    if (template.length === 0) {
      throw new Error('Template not found');
    }

    const templateData = template[0];
    
    // Replace template variables
    let content = templateData.template;
    const variables = templateData.variables || {};

    // Replace common variables
    content = content.replace(/\{\{keywords\}\}/g, request.keywords.join(', '));
    content = content.replace(/\{\{tone\}\}/g, request.tone);
    content = content.replace(/\{\{wordCount\}\}/g, request.wordCount.toString());
    content = content.replace(/\{\{targetAudience\}\}/g, request.targetAudience || 'general audience');

    // Replace custom variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, String(value));
    }

    return {
      title: this.extractTitle(content),
      content,
      qualityScore: 0.8, // Template-based content gets base quality score
    };
  }

  private async generateFromScratch(request: ContentGenerationRequest): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildPrompt(request);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO content writer specializing in E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) compliant content. Generate high-quality, engaging content that ranks well in search engines.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: request.wordCount * 2, // Allow for longer content
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const generatedText = completion.choices[0]?.message?.content || '';
      
      return {
        title: this.extractTitle(generatedText),
        content: generatedText,
        qualityScore: this.calculateQualityScore(generatedText, request),
      };
    } catch (error) {
      contentLogger.error('OpenAI API error', { error });
      throw new Error('Content generation failed');
    }
  }

  private buildPrompt(request: ContentGenerationRequest): string {
    const { contentType, keywords, targetAudience, tone, wordCount, eEatCompliance } = request;

    let prompt = `Generate a ${contentType} about: ${keywords.join(', ')}\n\n`;
    
    prompt += `Requirements:\n`;
    prompt += `- Word count: approximately ${wordCount} words\n`;
    prompt += `- Tone: ${tone}\n`;
    prompt += `- Target audience: ${targetAudience || 'general audience'}\n`;
    prompt += `- Include primary keywords naturally throughout the content\n`;
    prompt += `- Use secondary keywords and LSI keywords\n`;
    prompt += `- Include a compelling headline and subheadings\n`;
    prompt += `- Write in an engaging, readable style\n`;

    if (eEatCompliance) {
      prompt += `\nE-E-A-T Compliance:\n`;
      prompt += `- Demonstrate expertise through detailed, accurate information\n`;
      prompt += `- Show experience with practical examples and case studies\n`;
      prompt += `- Establish authoritativeness with credible sources and citations\n`;
      prompt += `- Build trustworthiness with transparent, honest content\n`;
    }

    switch (contentType) {
      case 'landing_page':
        prompt += `\nLanding Page Structure:\n`;
        prompt += `- Hero section with compelling headline and CTA\n`;
        prompt += `- Problem/solution sections\n`;
        prompt += `- Benefits and features\n`;
        prompt += `- Social proof and testimonials\n`;
        prompt += `- Clear call-to-action\n`;
        break;
      case 'blog_post':
        prompt += `\nBlog Post Structure:\n`;
        prompt += `- Engaging introduction\n`;
        prompt += `- Well-structured body with subheadings\n`;
        prompt += `- Practical tips and actionable advice\n`;
        prompt += `- Conclusion with key takeaways\n`;
        break;
      case 'service_page':
        prompt += `\nService Page Structure:\n`;
        prompt += `- Service overview and benefits\n`;
        prompt += `- Detailed service descriptions\n`;
        prompt += `- Process and methodology\n`;
        prompt += `- Pricing and packages\n`;
        prompt += `- Contact information\n`;
        break;
    }

    return prompt;
  }

  private extractTitle(content: string): string {
    // Extract title from content (first line or H1 tag)
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, ''); // Remove markdown headers
    }
    
    return 'Generated Content';
  }

  private calculateQualityScore(content: string, request: ContentGenerationRequest): number {
    let score = 0.5; // Base score

    // Check word count
    const wordCount = content.split(/\s+/).length;
    const wordCountRatio = wordCount / request.wordCount;
    if (wordCountRatio >= 0.8 && wordCountRatio <= 1.2) {
      score += 0.1;
    }

    // Check keyword density
    const keywordDensity = this.calculateKeywordDensity(content, request.keywords);
    if (keywordDensity >= 1 && keywordDensity <= 3) {
      score += 0.1;
    }

    // Check readability (simple heuristic)
    const avgWordsPerSentence = content.split(/[.!?]+/).length / content.split(/\s+/).length;
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      score += 0.1;
    }

    // Check structure
    const hasHeadings = /^#+\s+/m.test(content);
    if (hasHeadings) {
      score += 0.1;
    }

    // Check for actionable content
    const hasActionWords = /(how to|steps|guide|tips|tutorial|learn|discover)/i.test(content);
    if (hasActionWords) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    let keywordCount = 0;
    keywords.forEach(keyword => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      keywordWords.forEach(keywordWord => {
        keywordCount += words.filter(word => word === keywordWord).length;
      });
    });

    return (keywordCount / totalWords) * 100;
  }

  private async calculateEEATScore(content: any, request: ContentGenerationRequest): Promise<EEAtscore> {
    if (!config.content.eEatEnabled) {
      return {
        expertise: 0.5,
        experience: 0.5,
        authoritativeness: 0.5,
        trustworthiness: 0.5,
        overall: 0.5,
      };
    }

    // Simple E-E-A-T scoring based on content analysis
    const expertise = this.scoreExpertise(content.content);
    const experience = this.scoreExperience(content.content);
    const authoritativeness = this.scoreAuthoritativeness(content.content);
    const trustworthiness = this.scoreTrustworthiness(content.content);

    const overall = (expertise + experience + authoritativeness + trustworthiness) / 4;

    return {
      expertise,
      experience,
      authoritativeness,
      trustworthiness,
      overall,
    };
  }

  private scoreExpertise(content: string): number {
    let score = 0.3; // Base score

    // Check for technical terms and detailed explanations
    const technicalTerms = /(analysis|methodology|research|data|statistics|study|expert|professional|specialist)/gi;
    const technicalMatches = content.match(technicalTerms);
    if (technicalMatches && technicalMatches.length > 5) {
      score += 0.3;
    }

    // Check for specific details and numbers
    const hasNumbers = /\d+/.test(content);
    if (hasNumbers) {
      score += 0.2;
    }

    // Check for citations or references
    const hasCitations = /(source|reference|study|research|according to|data shows)/gi.test(content);
    if (hasCitations) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private scoreExperience(content: string): number {
    let score = 0.3; // Base score

    // Check for personal experience indicators
    const experienceIndicators = /(experience|worked|years|practice|client|project|case study|example)/gi;
    const experienceMatches = content.match(experienceIndicators);
    if (experienceMatches && experienceMatches.length > 3) {
      score += 0.4;
    }

    // Check for practical advice
    const hasPracticalAdvice = /(how to|step by step|process|method|approach|technique)/gi.test(content);
    if (hasPracticalAdvice) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  private scoreAuthoritativeness(content: string): number {
    let score = 0.3; // Base score

    // Check for authoritative language
    const authoritativeTerms = /(authority|expert|leader|specialist|certified|qualified|professional)/gi;
    const authorityMatches = content.match(authoritativeTerms);
    if (authorityMatches && authorityMatches.length > 2) {
      score += 0.3;
    }

    // Check for industry-specific knowledge
    const hasIndustryKnowledge = /(industry|market|sector|field|domain|specialization)/gi.test(content);
    if (hasIndustryKnowledge) {
      score += 0.2;
    }

    // Check for credentials or qualifications
    const hasCredentials = /(certified|licensed|qualified|degree|diploma|certification)/gi.test(content);
    if (hasCredentials) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private scoreTrustworthiness(content: string): number {
    let score = 0.3; // Base score

    // Check for transparent language
    const transparentTerms = /(honest|transparent|clear|accurate|reliable|trustworthy|credible)/gi;
    const transparentMatches = content.match(transparentTerms);
    if (transparentMatches && transparentMatches.length > 2) {
      score += 0.3;
    }

    // Check for disclaimers or limitations
    const hasDisclaimers = /(disclaimer|limitation|note|important|warning|caution)/gi.test(content);
    if (hasDisclaimers) {
      score += 0.2;
    }

    // Check for contact information or about section
    const hasContactInfo = /(contact|about|company|team|address|phone|email)/gi.test(content);
    if (hasContactInfo) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  async createTemplate(templateData: {
    name: string;
    type: string;
    template: string;
    variables?: Record<string, any>;
  }) {
    const template = await (db.insert(contentTemplates).values({
      name: templateData.name,
      type: templateData.type,
      template: templateData.template,
      variables: templateData.variables || {},
      eEatScore: 0.8, // Default E-E-A-T score for templates
      isActive: true,
    } as any) as any).returning();

    contentLogger.info('Content template created', { templateId: template[0].id });
    return template[0];
  }

  async getTemplates(type?: string) {
    let query = db.select().from(contentTemplates).where(eq(contentTemplates.isActive, true));
    
    if (type) {
      query = (query as any).where(eq(contentTemplates.type, type));
    }

    return await query;
  }

  async getGeneratedContent(projectId: string, contentType?: string) {
    let query = db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.projectId, projectId));

    if (contentType) {
      query = (query as any).where(eq(generatedContent.contentType, contentType));
    }

    return await query.orderBy(generatedContent.createdAt);
  }
}

// Singleton instance
export const contentGenerator = new ContentGenerator();
