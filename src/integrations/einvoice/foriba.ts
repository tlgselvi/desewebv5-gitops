import { IEInvoiceProvider, EInvoiceUser, EInvoiceDocument } from './types.js';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class ForibaProvider implements IEInvoiceProvider {
  name = 'Foriba';
  
  constructor(private username: string, private password: string) {}

  async checkUser(vkn: string): Promise<EInvoiceUser | null> {
    logger.info(`[Foriba] Checking e-invoice user: ${vkn}`);
    
    // Mock Response for Sandbox
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

  async sendInvoice(invoiceData: any): Promise<EInvoiceDocument> {
    logger.info(`[Foriba] Sending invoice to ${invoiceData.receiver.vkn}`);
    
    // Mock Response
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

  async getInvoiceStatus(uuid: string): Promise<string> {
    logger.info(`[Foriba] Checking status for ${uuid}`);
    // Mock randomly approved or processing
    return Math.random() > 0.5 ? 'approved' : 'processing';
  }
}
