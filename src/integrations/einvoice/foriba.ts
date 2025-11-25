import { IEInvoiceProvider, EInvoiceUser, EInvoiceDocument } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class ForibaProvider implements IEInvoiceProvider {
  name = 'Foriba';
  private baseUrl: string;
  private isSandbox: boolean;

  constructor(
    private username: string, 
    private password: string,
    options?: { sandbox?: boolean; baseUrl?: string }
  ) {
    this.isSandbox = options?.sandbox ?? true;
    this.baseUrl = options?.baseUrl ?? (this.isSandbox
      ? 'https://earsivtest.foriba.com/EarsivServices'
      : 'https://earsiv.foriba.com/EarsivServices');
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

    // Production mode: Real API call
    try {
      const response = await fetch(`${this.baseUrl}/QueryUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        },
        body: JSON.stringify({
          identifier: vkn,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        throw new Error(`Foriba API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        identifier: data.identifier,
        alias: data.alias,
        title: data.title,
        type: data.type,
        firstCreationTime: new Date(data.firstCreationTime),
      };
    } catch (error) {
      logger.error('[Foriba] Failed to check user', error);
      throw error;
    }
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
        profileId: 'TICARIFATURA',
        typeCode: 'SATIS',
        status: 'queued'
      };
    }

    // Production mode: Real API call
    try {
      // Convert invoice data to UBL-TR format (simplified - real implementation needs full UBL structure)
      const ublInvoice = this.convertToUBL(invoiceData);

      const response = await fetch(`${this.baseUrl}/SendInvoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        },
        body: ublInvoice, // XML string
      });

      if (!response.ok) {
        throw new Error(`Foriba API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.text(); // XML response
      const parsed = this.parseUBLResponse(data);

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
    } catch (error) {
      logger.error('[Foriba] Failed to send invoice', error);
      throw error;
    }
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

    // Production mode: Real API call
    try {
      const response = await fetch(`${this.baseUrl}/GetInvoiceStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        },
        body: JSON.stringify({ uuid }),
      });

      if (!response.ok) {
        throw new Error(`Foriba API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      logger.error('[Foriba] Failed to get invoice status', error);
      throw error;
    }
  }

  /**
   * Convert invoice data to UBL-TR XML format
   * Note: This is a simplified version. Real implementation needs full UBL-TR 1.2 schema
   */
  private convertToUBL(invoiceData: any): string {
    // TODO: Implement full UBL-TR 1.2 XML generation
    // For now, return a basic structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <!-- UBL-TR 1.2 structure here -->
</Invoice>`;
  }

  /**
   * Parse UBL response from Foriba
   */
  private parseUBLResponse(xml: string): any {
    // TODO: Implement XML parsing
    // For now, return mock structure
    return {
      uuid: uuidv4(),
      issueDate: new Date().toISOString(),
      id: `GIB2025${Math.floor(Math.random() * 1000000000)}`,
      status: 'queued',
    };
  }
}
