import { IBankProvider } from './types.js';
import { IsBankProvider } from './isbank.js';
import { logger } from '@/utils/logger.js';

/**
 * Factory pattern for creating bank providers
 */
export class BankProviderFactory {
  /**
   * Create a bank provider instance based on provider name
   */
  static create(
    provider: string,
    apiKey: string,
    apiSecret: string,
    options?: { sandbox?: boolean; baseUrl?: string }
  ): IBankProvider {
    switch (provider.toLowerCase()) {
      case 'isbank':
      case 'is_bank':
      case 'türkiye iş bankası':
        return new IsBankProvider(apiKey, apiSecret, options);
      
      // Future providers can be added here
      // case 'ziraat':
      //   return new ZiraatBankProvider(apiKey, apiSecret, options);
      // case 'garanti':
      //   return new GarantiBBVAProvider(apiKey, apiSecret, options);
      
      default:
        logger.warn(`[BankProviderFactory] Unknown provider: ${provider}, falling back to IsBank`);
        return new IsBankProvider(apiKey, apiSecret, options);
    }
  }

  /**
   * List available bank providers
   */
  static getAvailableProviders(): string[] {
    return ['isbank', 'ziraat', 'garanti']; // Future: Add more as implemented
  }
}

