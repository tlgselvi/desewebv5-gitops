import * as cheerio from 'cheerio';
import { logger } from '@/utils/logger.js';
import { redis } from '@/services/storage/redisClient.js';

export interface ExchangeRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
}

export class TCMBService {
  private readonly TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
  private readonly CACHE_KEY = 'tcmb:rates';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Fetch current exchange rates from TCMB
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    // Check Redis cache
    try {
      const cachedData = await redis.get(this.CACHE_KEY);
      if (cachedData) {
        logger.debug('TCMB rates fetched from Redis cache');
        return JSON.parse(cachedData);
      }
    } catch (error) {
      logger.warn('Redis cache error in TCMBService', error);
    }

    try {
      const response = await fetch(this.TCMB_URL);
      if (!response.ok) {
        throw new Error(`TCMB API responded with ${response.status}`);
      }

      const xmlData = await response.text();
      const $ = cheerio.load(xmlData, { xmlMode: true });

      const rates: ExchangeRate[] = [];

      $('Currency').each((_, element) => {
        const code = $(element).attr('CurrencyCode');
        const name = $(element).find('Isim').text();
        const buyingStr = $(element).find('ForexBuying').text();
        const sellingStr = $(element).find('ForexSelling').text();

        // Skip if key values are missing (sometimes Cross rates have empty buying/selling)
        if (code && buyingStr && sellingStr) {
            rates.push({
                code,
                name,
                buying: parseFloat(buyingStr) || 0,
                selling: parseFloat(sellingStr) || 0
            });
        }
      });

      // Add TRY manually for reference
      rates.push({ code: 'TRY', name: 'TÜRK LİRASI', buying: 1, selling: 1 });

      // Set Redis cache
      try {
        await redis.setex(this.CACHE_KEY, this.CACHE_TTL, JSON.stringify(rates));
      } catch (error) {
        logger.warn('Failed to set TCMB rates to Redis', error);
      }

      logger.info(`Fetched ${rates.length} exchange rates from TCMB`);
      return rates;

    } catch (error) {
      logger.error('Failed to fetch TCMB rates', error);
      // Try to return cached data even if expired/failed as fallback if possible
      // But since we don't have local cache anymore, we might check redis one last time without expiration check if needed
      // For now, return empty array
      return [];
    }
  }

  /**
   * Convert amount between currencies
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const rates = await this.getExchangeRates();
    const fromRate = rates.find(r => r.code === fromCurrency);
    const toRate = rates.find(r => r.code === toCurrency);

    if (!fromRate || !toRate) {
      throw new Error(`Currency conversion failed: ${fromCurrency} -> ${toCurrency} not found.`);
    }

    // Convert to TRY first (Using Buying rate for safety/standard)
    // NOTE: Real-world logic might vary (Buying vs Selling based on transaction type)
    // Here we use a simplified mid-market or buying approach.
    
    const amountInTry = amount * fromRate.buying;
    const result = amountInTry / toRate.selling; // Divide by selling to get target currency amount

    return parseFloat(result.toFixed(4));
  }
}

export const tcmbService = new TCMBService();

