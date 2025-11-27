/**
 * Content Indexer Service
 * 
 * Service for indexing content from various sources (database, files, API)
 * into the vector database
 */

import { logger } from '@/utils/logger.js';
import { getIndexingService } from './indexing.service.js';
import type { IndexingOptions, IndexingResult } from './indexing.service.js';
import { db } from '@/db/index.js';
import { invoices, accounts, contacts, deals, products } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * Content source types
 */
export type ContentSourceType = 'finance' | 'crm' | 'inventory' | 'hr' | 'service' | 'iot';

/**
 * Content Indexer Service
 */
export class ContentIndexerService {
  /**
   * Index finance module content (invoices, accounts, transactions)
   */
  async indexFinanceContent(
    organizationId: string,
    options?: { includeInvoices?: boolean; includeAccounts?: boolean },
  ): Promise<IndexingResult> {
    const results: IndexingResult[] = [];
    const errors: string[] = [];

    try {
      // Index invoices
      if (options?.includeInvoices !== false) {
        const invoiceResult = await this.indexInvoices(organizationId);
        results.push(invoiceResult);
        errors.push(...invoiceResult.errors);
      }

      // Index accounts
      if (options?.includeAccounts !== false) {
        const accountResult = await this.indexAccounts(organizationId);
        results.push(accountResult);
        errors.push(...accountResult.errors);
      }

      return this.aggregateResults(results, errors);
    } catch (error) {
      logger.error('Finance content indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };
    }
  }

  /**
   * Index CRM module content (contacts, deals, activities)
   */
  async indexCrmContent(
    organizationId: string,
    options?: { includeContacts?: boolean; includeDeals?: boolean },
  ): Promise<IndexingResult> {
    const results: IndexingResult[] = [];
    const errors: string[] = [];

    try {
      // Index contacts
      if (options?.includeContacts !== false) {
        const contactResult = await this.indexContacts(organizationId);
        results.push(contactResult);
        errors.push(...contactResult.errors);
      }

      // Index deals
      if (options?.includeDeals !== false) {
        const dealResult = await this.indexDeals(organizationId);
        results.push(dealResult);
        errors.push(...dealResult.errors);
      }

      return this.aggregateResults(results, errors);
    } catch (error) {
      logger.error('CRM content indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };
    }
  }

  /**
   * Index inventory module content (products, stock levels)
   */
  async indexInventoryContent(
    organizationId: string,
    options?: { includeProducts?: boolean },
  ): Promise<IndexingResult> {
    const results: IndexingResult[] = [];
    const errors: string[] = [];

    try {
      // Index products
      if (options?.includeProducts !== false) {
        const productResult = await this.indexProducts(organizationId);
        results.push(productResult);
        errors.push(...productResult.errors);
      }

      return this.aggregateResults(results, errors);
    } catch (error) {
      logger.error('Inventory content indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };
    }
  }

  /**
   * Index invoices
   */
  private async indexInvoices(organizationId: string): Promise<IndexingResult> {
    const indexingService = getIndexingService();
    const results: IndexingResult[] = [];

    try {
      const invoiceList = await db
        .select()
        .from(invoices)
        .where(eq(invoices.organizationId, organizationId))
        .limit(1000); // Process in batches

      logger.info('Indexing invoices', {
        count: invoiceList.length,
        organizationId,
      });

      for (const invoice of invoiceList) {
        const content = this.formatInvoiceContent(invoice);
        const result = await indexingService.indexDocument(content, {
          organizationId,
          sourceType: 'database',
          sourceId: invoice.id,
          sourceTypeDetail: 'invoices',
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            status: invoice.status,
            total: invoice.total?.toString(),
            currency: invoice.currency,
            invoiceDate: invoice.invoiceDate?.toISOString(),
          },
        });

        results.push(result);
      }

      return this.aggregateResults(results, []);
    } catch (error) {
      logger.error('Invoice indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Index accounts
   */
  private async indexAccounts(organizationId: string): Promise<IndexingResult> {
    const indexingService = getIndexingService();
    const results: IndexingResult[] = [];

    try {
      const accountList = await db
        .select()
        .from(accounts)
        .where(eq(accounts.organizationId, organizationId))
        .limit(1000);

      logger.info('Indexing accounts', {
        count: accountList.length,
        organizationId,
      });

      for (const account of accountList) {
        const content = this.formatAccountContent(account);
        const result = await indexingService.indexDocument(content, {
          organizationId,
          sourceType: 'database',
          sourceId: account.id,
          sourceTypeDetail: 'accounts',
          metadata: {
            code: account.code,
            name: account.name,
            type: account.type,
            currency: account.currency,
          },
        });

        results.push(result);
      }

      return this.aggregateResults(results, []);
    } catch (error) {
      logger.error('Account indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Index contacts
   */
  private async indexContacts(organizationId: string): Promise<IndexingResult> {
    const indexingService = getIndexingService();
    const results: IndexingResult[] = [];

    try {
      const contactList = await db
        .select()
        .from(contacts)
        .where(eq(contacts.organizationId, organizationId))
        .limit(1000);

      logger.info('Indexing contacts', {
        count: contactList.length,
        organizationId,
      });

      for (const contact of contactList) {
        const content = this.formatContactContent(contact);
        const result = await indexingService.indexDocument(content, {
          organizationId,
          sourceType: 'database',
          sourceId: contact.id,
          sourceTypeDetail: 'contacts',
          metadata: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            type: contact.type,
          },
        });

        results.push(result);
      }

      return this.aggregateResults(results, []);
    } catch (error) {
      logger.error('Contact indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Index deals
   */
  private async indexDeals(organizationId: string): Promise<IndexingResult> {
    const indexingService = getIndexingService();
    const results: IndexingResult[] = [];

    try {
      const dealList = await db
        .select()
        .from(deals)
        .where(eq(deals.organizationId, organizationId))
        .limit(1000);

      logger.info('Indexing deals', {
        count: dealList.length,
        organizationId,
      });

      for (const deal of dealList) {
        const content = this.formatDealContent(deal);
        const result = await indexingService.indexDocument(content, {
          organizationId,
          sourceType: 'database',
          sourceId: deal.id,
          sourceTypeDetail: 'deals',
          metadata: {
            title: deal.title,
            value: deal.value?.toString(),
            stage: deal.stage,
            status: deal.status,
          },
        });

        results.push(result);
      }

      return this.aggregateResults(results, []);
    } catch (error) {
      logger.error('Deal indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Index products
   */
  private async indexProducts(organizationId: string): Promise<IndexingResult> {
    const indexingService = getIndexingService();
    const results: IndexingResult[] = [];

    try {
      const productList = await db
        .select()
        .from(products)
        .where(eq(products.organizationId, organizationId))
        .limit(1000);

      logger.info('Indexing products', {
        count: productList.length,
        organizationId,
      });

      for (const product of productList) {
        const content = this.formatProductContent(product);
        const result = await indexingService.indexDocument(content, {
          organizationId,
          sourceType: 'database',
          sourceId: product.id,
          sourceTypeDetail: 'products',
          metadata: {
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: product.price?.toString(),
          },
        });

        results.push(result);
      }

      return this.aggregateResults(results, []);
    } catch (error) {
      logger.error('Product indexing failed', { error, organizationId });
      return {
        indexedCount: 0,
        chunkCount: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Format invoice content for indexing
   */
  private formatInvoiceContent(invoice: typeof invoices.$inferSelect): string {
    const parts: string[] = [];

    parts.push(`Invoice: ${invoice.invoiceNumber || 'N/A'}`);
    parts.push(`Type: ${invoice.type || 'N/A'}`);
    parts.push(`Status: ${invoice.status || 'N/A'}`);
    parts.push(`Date: ${invoice.invoiceDate?.toISOString() || 'N/A'}`);
    parts.push(`Total: ${invoice.total || '0'} ${invoice.currency || 'TRY'}`);

    if (invoice.notes) {
      parts.push(`Notes: ${invoice.notes}`);
    }

    return parts.join('\n');
  }

  /**
   * Format account content for indexing
   */
  private formatAccountContent(account: typeof accounts.$inferSelect): string {
    const parts: string[] = [];

    parts.push(`Account: ${account.name || 'N/A'}`);
    parts.push(`Code: ${account.code || 'N/A'}`);
    parts.push(`Type: ${account.type || 'N/A'}`);
    parts.push(`Currency: ${account.currency || 'TRY'}`);
    parts.push(`Balance: ${account.balance || '0'}`);

    return parts.join('\n');
  }

  /**
   * Format contact content for indexing
   */
  private formatContactContent(contact: typeof contacts.$inferSelect): string {
    const parts: string[] = [];

    parts.push(`Contact: ${contact.name || 'N/A'}`);
    parts.push(`Type: ${contact.type || 'N/A'}`);
    if (contact.email) parts.push(`Email: ${contact.email}`);
    if (contact.phone) parts.push(`Phone: ${contact.phone}`);
    if (contact.company) parts.push(`Company: ${contact.company}`);
    if (contact.notes) parts.push(`Notes: ${contact.notes}`);

    return parts.join('\n');
  }

  /**
   * Format deal content for indexing
   */
  private formatDealContent(deal: typeof deals.$inferSelect): string {
    const parts: string[] = [];

    parts.push(`Deal: ${deal.title || 'N/A'}`);
    parts.push(`Stage: ${deal.stage || 'N/A'}`);
    parts.push(`Status: ${deal.status || 'N/A'}`);
    if (deal.value) parts.push(`Value: ${deal.value}`);
    if (deal.description) parts.push(`Description: ${deal.description}`);
    if (deal.expectedCloseDate) {
      parts.push(`Expected Close: ${deal.expectedCloseDate.toISOString()}`);
    }

    return parts.join('\n');
  }

  /**
   * Format product content for indexing
   */
  private formatProductContent(product: typeof products.$inferSelect): string {
    const parts: string[] = [];

    parts.push(`Product: ${product.name || 'N/A'}`);
    if (product.sku) parts.push(`SKU: ${product.sku}`);
    if (product.category) parts.push(`Category: ${product.category}`);
    if (product.description) parts.push(`Description: ${product.description}`);
    if (product.price) parts.push(`Price: ${product.price}`);
    if (product.unit) parts.push(`Unit: ${product.unit}`);

    return parts.join('\n');
  }

  /**
   * Aggregate multiple indexing results
   */
  private aggregateResults(
    results: IndexingResult[],
    additionalErrors: string[],
  ): IndexingResult {
    return {
      indexedCount: results.reduce((sum, r) => sum + r.indexedCount, 0),
      chunkCount: results.reduce((sum, r) => sum + r.chunkCount, 0),
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      errors: [
        ...results.flatMap((r) => r.errors),
        ...additionalErrors,
      ],
    };
  }
}

// Singleton instance
let contentIndexerServiceInstance: ContentIndexerService | null = null;

/**
 * Get content indexer service instance
 */
export function getContentIndexerService(): ContentIndexerService {
  if (!contentIndexerServiceInstance) {
    contentIndexerServiceInstance = new ContentIndexerService();
  }
  return contentIndexerServiceInstance;
}

