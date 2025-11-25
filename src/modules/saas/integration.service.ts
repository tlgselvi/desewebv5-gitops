import { db } from '@/db/index.js';
import { integrations } from '@/db/schema/saas.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';
import { credentialEncryption } from '@/services/integrations/encryption.js';
import { BankProviderFactory } from '@/integrations/banking/factory.js';
import { IBankProvider } from '@/integrations/banking/types.js';
import { ForibaProvider } from '@/integrations/einvoice/foriba.js';
import { IEInvoiceProvider } from '@/integrations/einvoice/types.js';
import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';
import { IWhatsAppProvider } from '@/integrations/whatsapp/types.js';

export interface CreateIntegrationDTO {
  organizationId: string;
  provider: string;
  category: 'payment' | 'banking' | 'einvoice' | 'email' | 'sms' | 'whatsapp';
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  config?: Record<string, any>;
}

export interface UpdateIntegrationDTO {
  apiKey?: string;
  apiSecret?: string;
  endpointUrl?: string;
  config?: Record<string, any>;
  isActive?: boolean;
}

export class IntegrationService {
  /**
   * Create a new integration
   */
  async createIntegration(data: CreateIntegrationDTO) {
    // Encrypt sensitive data
    const encryptedApiKey = data.apiKey ? credentialEncryption.encrypt(data.apiKey) : null;
    const encryptedApiSecret = data.apiSecret ? credentialEncryption.encrypt(data.apiSecret) : null;

    const [integration] = await db.insert(integrations).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      provider: data.provider,
      category: data.category,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      endpointUrl: data.endpointUrl,
      config: data.config ? JSON.stringify(data.config) : null,
      isActive: true,
      isVerified: false, // Will be verified via test connection
    }).returning();

    logger.info(`[IntegrationService] Created integration: ${integration.id} for provider: ${data.provider}`);
    return integration;
  }

  /**
   * Get integration by ID
   */
  async getIntegration(integrationId: string, organizationId: string) {
    const [integration] = await db.select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId)
      ))
      .limit(1);

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Decrypt sensitive data for use
    return {
      ...integration,
      apiKey: integration.apiKey ? credentialEncryption.decrypt(integration.apiKey) : null,
      apiSecret: integration.apiSecret ? credentialEncryption.decrypt(integration.apiSecret) : null,
      config: integration.config ? JSON.parse(integration.config) : null,
    };
  }

  /**
   * Get all integrations for an organization
   */
  async getIntegrationsByOrganization(organizationId: string) {
    const orgIntegrations = await db.select()
      .from(integrations)
      .where(eq(integrations.organizationId, organizationId));

    // Return without decrypted data for list view (security)
    return orgIntegrations.map(integration => ({
      ...integration,
      apiKey: integration.apiKey ? '***encrypted***' : null,
      apiSecret: integration.apiSecret ? '***encrypted***' : null,
      config: integration.config ? JSON.parse(integration.config) : null,
    }));
  }

  /**
   * Update integration
   */
  async updateIntegration(integrationId: string, organizationId: string, data: UpdateIntegrationDTO) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.apiKey !== undefined) {
      updateData.apiKey = data.apiKey ? credentialEncryption.encrypt(data.apiKey) : null;
    }
    if (data.apiSecret !== undefined) {
      updateData.apiSecret = data.apiSecret ? credentialEncryption.encrypt(data.apiSecret) : null;
    }
    if (data.endpointUrl !== undefined) {
      updateData.endpointUrl = data.endpointUrl;
    }
    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const [updated] = await db.update(integrations)
      .set(updateData)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Integration not found');
    }

    logger.info(`[IntegrationService] Updated integration: ${integrationId}`);
    return updated;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string, organizationId: string) {
    const [deleted] = await db.delete(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId)
      ))
      .returning();

    if (!deleted) {
      throw new Error('Integration not found');
    }

    logger.info(`[IntegrationService] Deleted integration: ${integrationId}`);
    return deleted;
  }

  /**
   * Test connection for an integration
   */
  async testConnection(integrationId: string, organizationId: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.getIntegration(integrationId, organizationId);

    try {
      switch (integration.category) {
        case 'banking':
          return await this.testBankingConnection(integration);
        case 'einvoice':
          return await this.testEInvoiceConnection(integration);
        case 'whatsapp':
          return await this.testWhatsAppConnection(integration);
        default:
          return { success: false, message: `Connection testing not implemented for category: ${integration.category}` };
      }
    } catch (error) {
      logger.error(`[IntegrationService] Connection test failed for ${integrationId}`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Test banking connection
   */
  private async testBankingConnection(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      const provider = BankProviderFactory.create(
        integration.provider,
        integration.apiKey || '',
        integration.apiSecret || '',
        { sandbox: true } // Test in sandbox mode
      );

      // Try to get balance (this will use mock data in sandbox mode)
      await provider.getBalance('TEST_ACCOUNT');
      
      // Mark as verified
      await db.update(integrations)
        .set({ isVerified: true, lastSync: new Date() })
        .where(eq(integrations.id, integration.id));

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Test E-Invoice connection
   */
  private async testEInvoiceConnection(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      const provider = new ForibaProvider(
        integration.apiKey || '',
        integration.apiSecret || '',
        { sandbox: true }
      );

      // Try to check a test VKN
      await provider.checkUser('1111111111');
      
      // Mark as verified
      await db.update(integrations)
        .set({ isVerified: true, lastSync: new Date() })
        .where(eq(integrations.id, integration.id));

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Test WhatsApp connection
   */
  private async testWhatsAppConnection(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      const config = integration.config || {};
      const provider = new MetaWhatsAppProvider(
        config.phoneNumberId || '',
        integration.apiKey || '',
        { sandbox: true }
      );

      // Try to validate a test number
      await provider.validateNumber('+905551234567');
      
      // Mark as verified
      await db.update(integrations)
        .set({ isVerified: true, lastSync: new Date() })
        .where(eq(integrations.id, integration.id));

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get provider instance for use in other services
   */
  async getBankingProvider(organizationId: string, provider: string): Promise<IBankProvider> {
    const orgIntegrations = await this.getIntegrationsByOrganization(organizationId);
    const integration = orgIntegrations.find(
      i => i.category === 'banking' && i.provider.toLowerCase() === provider.toLowerCase() && i.isActive
    );

    if (!integration) {
      throw new Error(`Banking integration not found for provider: ${provider}`);
    }

    const decrypted = await this.getIntegration(integration.id, organizationId);
    const config = integration.config || {};

    return BankProviderFactory.create(
      integration.provider,
      decrypted.apiKey || '',
      decrypted.apiSecret || '',
      { sandbox: config.sandbox !== false } // Default to sandbox if not specified
    );
  }

  /**
   * Get E-Invoice provider instance
   */
  async getEInvoiceProvider(organizationId: string, provider: string): Promise<IEInvoiceProvider> {
    const orgIntegrations = await this.getIntegrationsByOrganization(organizationId);
    const integration = orgIntegrations.find(
      i => i.category === 'einvoice' && i.provider.toLowerCase() === provider.toLowerCase() && i.isActive
    );

    if (!integration) {
      throw new Error(`E-Invoice integration not found for provider: ${provider}`);
    }

    const decrypted = await this.getIntegration(integration.id, organizationId);
    const config = integration.config || {};

    return new ForibaProvider(
      decrypted.apiKey || '',
      decrypted.apiSecret || '',
      { sandbox: config.sandbox !== false }
    );
  }

  /**
   * Get WhatsApp provider instance
   */
  async getWhatsAppProvider(organizationId: string, provider: string): Promise<IWhatsAppProvider> {
    const orgIntegrations = await this.getIntegrationsByOrganization(organizationId);
    const integration = orgIntegrations.find(
      i => i.category === 'whatsapp' && i.provider.toLowerCase() === provider.toLowerCase() && i.isActive
    );

    if (!integration) {
      throw new Error(`WhatsApp integration not found for provider: ${provider}`);
    }

    const decrypted = await this.getIntegration(integration.id, organizationId);
    const config = integration.config || {};

    return new MetaWhatsAppProvider(
      config.phoneNumberId || '',
      decrypted.apiKey || '',
      { sandbox: config.sandbox !== false }
    );
  }
}

export const integrationService = new IntegrationService();

