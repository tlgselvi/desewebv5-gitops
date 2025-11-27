import { describe, it, expect } from 'vitest';
import { UBLGenerator } from '@/integrations/einvoice/ubl-generator.js';

describe('UBL Generator', () => {
  describe('validateInvoiceData', () => {
    it('should validate correct invoice data', () => {
      const validData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            description: 'Test Product',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
        payableAmount: 120, // Required field
      };

      const result = UBLGenerator.validateInvoiceData(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when receiver VKN is missing', () => {
      const invalidData = {
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Receiver VKN/TCKN is required');
    });

    it('should return error when sender VKN is missing', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sender VKN is required');
    });

    it('should validate VKN format (10 digits for company)', () => {
      const invalidData = {
        receiver: { vkn: '12345' }, // Too short
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Receiver VKN/TCKN must be 10 or 11 digits');
    });

    it('should accept 11-digit TCKN', () => {
      const validData = {
        receiver: { vkn: '12345678901' }, // 11 digits (TCKN)
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
        payableAmount: 120, // Required field
      };

      const result = UBLGenerator.validateInvoiceData(validData);

      expect(result.valid).toBe(true);
    });

    it('should validate VKN contains only digits', () => {
      const invalidData = {
        receiver: { vkn: '123456789a' }, // Contains letter
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Receiver VKN/TCKN must contain only digits');
    });

    it('should validate sender VKN is exactly 10 digits', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '987654321' }, // 9 digits
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sender VKN must be 10 digits');
    });

    it('should return error when items array is empty', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one invoice item is required');
    });

    it('should return error when items is missing', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one invoice item is required');
    });

    it('should validate item required fields', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            // Missing description
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('description'))).toBe(true);
    });

    it('should validate item quantity is positive', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            description: 'Test',
            quantity: 0, // Invalid
            unitPrice: 100,
            taxRate: 20,
          },
        ],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('quantity'))).toBe(true);
    });

    it('should validate item unitPrice is non-negative', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: -10, // Invalid
            taxRate: 20,
          },
        ],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('unitPrice'))).toBe(true);
    });

    it('should validate item taxRate is non-negative', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 100,
            taxRate: -5, // Invalid
          },
        ],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('taxRate'))).toBe(true);
    });

    it('should validate item taxRate is not greater than 100', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 100,
            taxRate: 150, // Invalid (> 100)
          },
        ],
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('taxRate'))).toBe(true);
    });

    it('should validate currency code format', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
        currency: 'try', // Should be uppercase
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Currency'))).toBe(true);
    });

    it('should validate profile ID', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
        profileId: 'INVALID_PROFILE',
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ProfileID'))).toBe(true);
    });

    it('should validate type code', () => {
      const invalidData = {
        receiver: { vkn: '1234567890' },
        sender: { vkn: '9876543210' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20 }],
        typeCode: 'INVALID_TYPE',
      };

      const result = UBLGenerator.validateInvoiceData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('TypeCode'))).toBe(true);
    });
  });

  describe('generateInvoice', () => {
    it('should generate UBL XML for valid invoice data', () => {
      const invoiceData = {
        id: 'INV-001',
        receiver: {
          vkn: '1234567890',
          name: 'Test Company',
          district: 'Kadikoy',
          city: 'Istanbul',
        },
        sender: {
          vkn: '9876543210',
          name: 'Sender Company',
          district: 'Cankaya',
          city: 'Ankara',
        },
        items: [
          {
            description: 'Test Product',
            quantity: 2,
            unitPrice: 100,
            taxRate: 20,
            unit: 'NIU',
          },
        ],
        payableAmount: 240,
        currency: 'TRY',
      };

      const ubl = UBLGenerator.generateInvoice(invoiceData);

      expect(ubl).toContain('<?xml');
      expect(ubl).toContain('<Invoice');
      expect(ubl).toContain('INV-001');
      expect(ubl).toContain('1234567890'); // Receiver VKN
      expect(ubl).toContain('9876543210'); // Sender VKN
      expect(ubl).toContain('Test Product');
    });

    it('should include tax calculations in UBL', () => {
      const invoiceData = {
        id: 'INV-002',
        receiver: {
          vkn: '1234567890',
          name: 'Test Company',
          city: 'Istanbul',
        },
        sender: {
          vkn: '9876543210',
          name: 'Sender Company',
          city: 'Ankara',
        },
        items: [
          {
            description: 'Product A',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
            unit: 'NIU',
          },
        ],
        payableAmount: 120,
        currency: 'TRY',
      };

      const ubl = UBLGenerator.generateInvoice(invoiceData);

      // Should contain tax amount (20% of 100 = 20)
      expect(ubl).toContain('20');
      // Should contain total (100 + 20 = 120)
      expect(ubl).toContain('120');
    });

    it('should handle multiple items', () => {
      const invoiceData = {
        id: 'INV-003',
        receiver: {
          vkn: '1234567890',
          name: 'Test Company',
          city: 'Istanbul',
        },
        sender: {
          vkn: '9876543210',
          name: 'Sender Company',
          city: 'Ankara',
        },
        items: [
          {
            description: 'Product A',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
            unit: 'NIU',
          },
          {
            description: 'Product B',
            quantity: 2,
            unitPrice: 50,
            taxRate: 10,
            unit: 'NIU',
          },
        ],
        payableAmount: 240,
        currency: 'TRY',
      };

      const ubl = UBLGenerator.generateInvoice(invoiceData);

      expect(ubl).toContain('Product A');
      expect(ubl).toContain('Product B');
    });

    it('should escape XML special characters', () => {
      const invoiceData = {
        id: 'INV-004',
        receiver: {
          vkn: '1234567890',
          name: 'Company & Co. <Test>',
          city: 'Istanbul',
        },
        sender: {
          vkn: '9876543210',
          name: 'Sender "Quote" Co.',
          city: 'Ankara',
        },
        items: [
          {
            description: 'Product <>&"\'',
            quantity: 1,
            unitPrice: 100,
            taxRate: 20,
            unit: 'NIU',
          },
        ],
        payableAmount: 120,
        currency: 'TRY',
      };

      const ubl = UBLGenerator.generateInvoice(invoiceData);

      // Should escape XML characters
      expect(ubl).toContain('&amp;');
      expect(ubl).toContain('&lt;');
      expect(ubl).toContain('&gt;');
      expect(ubl).toContain('&quot;');
      expect(ubl).toContain('&apos;');
    });
  });

  describe('validateUBLCompliance', () => {
    it('should validate compliant UBL XML', () => {
      const invoiceData = {
        receiver: { vkn: '1234567890', name: 'Test', city: 'Istanbul' },
        sender: { vkn: '9876543210', name: 'Sender', city: 'Ankara' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20, unit: 'NIU' }],
        payableAmount: 120,
        currency: 'TRY',
      };

      const xml = UBLGenerator.generateInvoice(invoiceData);
      const result = UBLGenerator.validateUBLCompliance(xml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required elements', () => {
      const invalidXml = '<?xml version="1.0"?><Invoice></Invoice>';

      const result = UBLGenerator.validateUBLCompliance(invalidXml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate CustomizationID is TR1.2', () => {
      const invoiceData = {
        receiver: { vkn: '1234567890', name: 'Test', city: 'Istanbul' },
        sender: { vkn: '9876543210', name: 'Sender', city: 'Ankara' },
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, taxRate: 20, unit: 'NIU' }],
        payableAmount: 120,
        currency: 'TRY',
      };

      const xml = UBLGenerator.generateInvoice(invoiceData);
      const result = UBLGenerator.validateUBLCompliance(xml);

      expect(result.valid).toBe(true);
      expect(xml).toContain('CustomizationID>TR1.2');
    });
  });
});

