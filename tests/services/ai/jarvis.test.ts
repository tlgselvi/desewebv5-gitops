import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JarvisService } from '@/services/ai/jarvis.js';
import { genAIAppBuilderService } from '@/services/ai/genai-app-builder.js';

// Mock OpenAI - create mock function inside factory
vi.mock('openai', () => {
  const mockChatCompletionsCreate = vi.fn();
  
  return {
    default: class {
      constructor() {
        return {
          chat: {
            completions: {
              create: mockChatCompletionsCreate,
            },
          },
        };
      }
    },
    __getMockCreate: () => mockChatCompletionsCreate,
  };
});

// Mock GenAI App Builder
vi.mock('@/services/ai/genai-app-builder.js', () => ({
  genAIAppBuilderService: {
    isEnabled: vi.fn(),
    chat: vi.fn(),
    generateFinancialInsights: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock agents
vi.mock('@/services/ai/agents/index.js', () => ({
  finBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  muBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  seoBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  serviceBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  salesBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  stockBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  hrBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  iotBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  aiopsBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
  procurementBotAgent: {
    getStatus: vi.fn().mockReturnValue({ enabled: true }),
  },
}));

// Mock agent communication
vi.mock('@/services/ai/agent-communication.js', () => ({
  agentCommunication: {
    getStreamInfo: vi.fn().mockResolvedValue({
      length: 0,
      lastMessageId: undefined,
    }),
  },
}));

describe('JARVIS Service', () => {
  let jarvisService: JarvisService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: GenAI disabled
    vi.mocked(genAIAppBuilderService.isEnabled).mockReturnValue(false);
    
    jarvisService = new JarvisService();
  });

  describe('predictFinancials', () => {
    it('should return default prediction when no history provided', async () => {
      const result = await jarvisService.predictFinancials([]);

      expect(result).toEqual({
        predictedRevenue: 150000,
        confidence: 0.5,
        reasoning: 'Yetersiz geçmiş veri. Tahmin için daha fazla finansal veri gerekiyor.',
      });
    });

    it('should handle financial prediction with history', async () => {
      const history = [
        { month: '2024-01', revenue: 150000 },
        { month: '2024-02', revenue: 157500 },
      ];

      const result = await jarvisService.predictFinancials(history);

      // Should return valid prediction result
      expect(result.predictedRevenue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
    });

    it('should fallback to OpenAI when GenAI fails', async () => {
      vi.mocked(genAIAppBuilderService.isEnabled).mockReturnValue(true);
      vi.mocked(genAIAppBuilderService.generateFinancialInsights).mockRejectedValue(
        new Error('GenAI service unavailable')
      );
      
      process.env.OPENAI_API_KEY = 'test-key';
      
      // Get mock function from OpenAI module
      const openAIModule = await import('openai');
      const mockCreate = (openAIModule as any).__getMockCreate();
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                predictedRevenue: 160000,
                confidence: 0.8,
                reasoning: 'OpenAI fallback prediction',
              }),
            },
          },
        ],
      });

      const history = [{ month: '2024-01', revenue: 150000 }];
      const result = await jarvisService.predictFinancials(history);

      expect(result.predictedRevenue).toBe(160000);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use statistical prediction when no AI available', async () => {
      vi.mocked(genAIAppBuilderService.isEnabled).mockReturnValue(false);
      delete process.env.OPENAI_API_KEY;

      const history = [
        { month: '2024-01', revenue: 100000 },
        { month: '2024-02', revenue: 110000 },
        { month: '2024-03', revenue: 120000 },
      ];

      const result = await jarvisService.predictFinancials(history);

      // Statistical prediction should calculate average growth
      expect(result.predictedRevenue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      // Reasoning may vary, just check it's a valid string
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
    });
  });

  describe('analyzeLogs', () => {
    it('should analyze logs and return valid result', async () => {
      const logs = [
        'ERROR: Database connection failed',
        'ERROR: Connection timeout after 30s',
      ];

      const result = await jarvisService.analyzeLogs(logs);

      // Should return valid analysis result
      expect(result.rootCause).toBeDefined();
      expect(result.solution).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
    });

    it('should return mock analysis when no AI available', async () => {
      vi.mocked(genAIAppBuilderService.isEnabled).mockReturnValue(false);
      delete process.env.OPENAI_API_KEY;

      const logs = ['ERROR: Test error'];
      const result = await jarvisService.analyzeLogs(logs);

      expect(result.rootCause).toContain('Mock analysis');
      expect(result.solution).toBeDefined();
      expect(result.severity).toBeDefined();
    });
  });

  describe('scoreLead', () => {
    it('should return default score when no AI available', async () => {
      vi.mocked(genAIAppBuilderService.isEnabled).mockReturnValue(false);
      delete process.env.OPENAI_API_KEY;

      const leadData = {
        email: 'test@example.com',
        company: 'Test Corp',
      };

      const result = await jarvisService.scoreLead(leadData);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['cold', 'warm', 'hot']).toContain(result.category);
    });
  });

  describe('getAgentStatus', () => {
    it('should return status for a specific agent', async () => {
      const status = await jarvisService.getAgentStatus('finbot');

      expect(status).toBeDefined();
      expect(status).toHaveProperty('agentId');
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('status');
      expect(status.agentId).toBe('finbot');
    });
  });
});
