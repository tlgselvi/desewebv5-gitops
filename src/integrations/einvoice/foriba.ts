import { IEInvoiceProvider, EInvoiceUser, EInvoiceDocument } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { UBLGenerator } from './ubl-generator.js';
import { retry, isRetryableHttpError } from '@/utils/retry.js';
import * as cheerio from 'cheerio';

export class ForibaProvider implements IEInvoiceProvider {
  name = 'Foriba';
  private baseUrl: string;
  private isSandbox: boolean;
  private authHeader: string;

  constructor(
    private username: string, 
    private password: string,
    options?: { sandbox?: boolean; baseUrl?: string }
  ) {
    this.isSandbox = options?.sandbox ?? true;
    this.baseUrl = options?.baseUrl ?? (this.isSandbox
      ? 'https://earsivtest.foriba.com/EarsivServices'
      : 'https://earsiv.foriba.com/EarsivServices');
    this.authHeader = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
  }

  /**
   * Check if a VKN/TCKN is registered for e-invoice
   */
  async checkUser(vkn: string): Promise<EInvoiceUser | null> {
    logger.info(`[Foriba] Checking e-invoice user: ${vkn}`);

    // Sandbox mode: Return mock data
    if (this.isSandbox || !this.username || !this.password) {
      logger.debug('[Foriba] Using sandbox/mock mode');
      // 1111111111 is a common test VKN
      if (vkn === '1111111111' || vkn === '1234567890') {
        return {
          identifier: vkn,
          alias: 'urn:mail:defaultpk',
          title: vkn === '1111111111' ? 'MOCK MÜKELLEF A.Ş.' : 'TEST LTD. ŞTİ.',
          type: 'private',
          firstCreationTime: new Date('2020-01-01')
        };
      }
      return null;
    }

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const response = await fetch(`${this.baseUrl}/QueryUsers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.authHeader,
          },
          body: JSON.stringify({
            identifier: vkn,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          if (response.status === 404) {
            return null; // User not found
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Foriba API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        logger.info(`[Foriba] User found: ${data.title}`);
        return {
          identifier: data.identifier,
          alias: data.alias,
          title: data.title,
          type: data.type,
          firstCreationTime: new Date(data.firstCreationTime),
        };
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        retryableErrors: (error) => {
          // Don't retry on 404 or 401 (authentication errors)
          if (error instanceof Error) {
            if (error.message.includes('404') || error.message.includes('401')) {
              return false;
            }
          }
          return isRetryableHttpError(error);
        },
      }
    ).catch((error) => {
      logger.error('[Foriba] Failed to check user after retries', { error, vkn });
      throw error;
    });
  }

  /**
   * Send invoice to GIB via Foriba
   */
  async sendInvoice(invoiceData: any): Promise<EInvoiceDocument> {
    logger.info(`[Foriba] Sending invoice to ${invoiceData.receiver?.vkn || 'unknown'}`);

    // Sandbox mode: Return mock data
    if (this.isSandbox || !this.username || !this.password) {
      logger.debug('[Foriba] Using sandbox/mock mode');
      return {
        uuid: uuidv4(),
        issueDate: new Date(),
        id: `GIB2025${Math.floor(Math.random() * 1000000000)}`,
        payableAmount: invoiceData.payableAmount,
        currency: invoiceData.currency || 'TRY',
        profileId: invoiceData.profileId || 'TICARIFATURA',
        typeCode: invoiceData.typeCode || 'SATIS',
        status: 'queued'
      };
    }

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        // Convert invoice data to UBL-TR format
        const ublInvoice = this.convertToUBL(invoiceData);

        const response = await fetch(`${this.baseUrl}/SendInvoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Authorization': this.authHeader,
          },
          body: ublInvoice, // XML string
          signal: AbortSignal.timeout(60000), // 60 second timeout for invoice sending
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[Foriba] Invoice send failed', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          throw new Error(`Foriba API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.text(); // XML response
        const parsed = this.parseUBLResponse(data);

        logger.info(`[Foriba] Invoice sent successfully`, {
          uuid: parsed.uuid,
          id: parsed.id,
        });

        return {
          uuid: parsed.uuid,
          issueDate: new Date(parsed.issueDate),
          id: parsed.id,
          payableAmount: invoiceData.payableAmount,
          currency: invoiceData.currency || 'TRY',
          profileId: invoiceData.profileId || 'TICARIFATURA',
          typeCode: invoiceData.typeCode || 'SATIS',
          status: parsed.status,
          envelopeId: parsed.envelopeId,
        };
      },
      {
        maxRetries: 3,
        delayMs: 2000, // Longer delay for invoice sending
        retryableErrors: (error) => {
          // Don't retry on 400 (bad request) or 401 (auth errors)
          if (error instanceof Error) {
            if (error.message.includes('400') || error.message.includes('401')) {
              return false;
            }
          }
          return isRetryableHttpError(error);
        },
      }
    ).catch((error) => {
      logger.error('[Foriba] Failed to send invoice after retries', { error, invoiceData });
      throw error;
    });
  }

  /**
   * Get invoice status from GIB
   */
  async getInvoiceStatus(uuid: string): Promise<string> {
    logger.info(`[Foriba] Checking status for ${uuid}`);

    // Sandbox mode: Return mock data
    if (this.isSandbox || !this.username || !this.password) {
      logger.debug('[Foriba] Using sandbox/mock mode');
      return Math.random() > 0.5 ? 'approved' : 'processing';
    }

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const response = await fetch(`${this.baseUrl}/GetInvoiceStatus`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.authHeader,
          },
          body: JSON.stringify({ uuid }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Foriba API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        logger.debug(`[Foriba] Invoice status retrieved: ${data.status}`, { uuid });
        return data.status;
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        retryableErrors: isRetryableHttpError,
      }
    ).catch((error) => {
      logger.error('[Foriba] Failed to get invoice status after retries', { error, uuid });
      throw error;
    });
  }

  /**
   * Convert invoice data to UBL-TR XML format
   */
  private convertToUBL(invoiceData: any): string {
    return UBLGenerator.generateInvoice(invoiceData);
  }

  /**
   * Parse UBL response from Foriba
   * Parses XML response to extract invoice details
   */
  private parseUBLResponse(xml: string): {
    uuid: string;
    issueDate: string;
    id: string;
    status: string;
    envelopeId?: string;
  } {
    try {
      const $ = cheerio.load(xml, { xmlMode: true });

      // Extract UUID
      const uuid = $('UUID').first().text() || uuidv4();
      
      // Extract Invoice ID
      const id = $('ID').first().text() || `GIB2025${Math.floor(Math.random() * 1000000000)}`;
      
      // Extract Issue Date
      const issueDateStr = $('IssueDate').first().text();
      const issueTimeStr = $('IssueTime').first().text();
      const issueDate = issueDateStr && issueTimeStr 
        ? new Date(`${issueDateStr}T${issueTimeStr}`).toISOString()
        : new Date().toISOString();

      // Extract status from response (may vary by API response format)
      // Common statuses: queued, processing, sent, approved, rejected
      let status = 'queued';
      const statusText = $('Status').first().text()?.toLowerCase() || '';
      if (statusText.includes('approved') || statusText.includes('onaylandı')) {
        status = 'approved';
      } else if (statusText.includes('rejected') || statusText.includes('reddedildi')) {
        status = 'rejected';
      } else if (statusText.includes('sent') || statusText.includes('gönderildi')) {
        status = 'sent';
      } else if (statusText.includes('processing') || statusText.includes('işleniyor')) {
        status = 'processing';
      }

      // Extract envelope ID if present
      const envelopeId = $('EnvelopeID').first().text() || 
                        $('EnvelopeId').first().text() ||
                        $('envelopeId').first().text();

      return {
        uuid,
        issueDate,
        id,
        status,
        envelopeId: envelopeId || undefined,
      };
    } catch (error) {
      logger.warn('[Foriba] Failed to parse UBL response, using fallback', { error, xml: xml.substring(0, 500) });
      // Fallback to basic structure
      return {
        uuid: uuidv4(),
        issueDate: new Date().toISOString(),
        id: `GIB2025${Math.floor(Math.random() * 1000000000)}`,
        status: 'queued',
      };
    }
  }
}
