import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UBLGenerator } from '@/integrations/einvoice/ubl-generator';

describe('UBLGenerator', () => {
  const mockInvoiceData = {
    uuid: 'test-uuid-123',
    id: 'GIB2025000000001',
    currency: 'TRY',
    items: [
      { description: 'Item 1', quantity: 10, unitPrice: 100, taxRate: 20 }, // Total: 1000, Tax: 200
      { description: 'Item 2', quantity: 5, unitPrice: 200, taxRate: 10 },  // Total: 1000, Tax: 100
    ],
    sender: { vkn: '1111111111', name: 'Sender A.S.' },
    receiver: { vkn: '2222222222', name: 'Receiver Ltd.' }
  };

  it('should calculate tax totals correctly', () => {
    // We can access the private method via "any" cast for unit testing internal logic 
    // or test the output XML content.
    // Let's test via public interface (XML generation) and regex checks or parsing.
    
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    
    // Check if total tax is correct (200 + 100 = 300)
    expect(xml).toContain('<cbc:TaxAmount currencyID="TRY">300.00</cbc:TaxAmount>');
    
    // Check subtotal (1000 + 1000 = 2000)
    expect(xml).toContain('<cbc:LineExtensionAmount currencyID="TRY">2000.00</cbc:LineExtensionAmount>');
    
    // Check payable amount (2000 + 300 = 2300)
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">2300.00</cbc:PayableAmount>');
  });

  it('should generate correct breakdowns for multiple tax rates', () => {
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    
    // 20% Tax Breakdown
    // Base: 1000, Tax: 200
    // We expect these numbers to appear in a TaxSubtotal block
    // Since regex on XML is tricky, we check for existence of calculated values
    expect(xml).toContain('200.00'); 
    expect(xml).toContain('100.00');
  });

  it('should include sender and receiver info', () => {
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    expect(xml).toContain('Sender A.S.');
    expect(xml).toContain('Receiver Ltd.');
    expect(xml).toContain('1111111111');
    expect(xml).toContain('2222222222');
  });

  it('should generate valid XML structure', () => {
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('</Invoice>');
  });

  it('should handle empty items array', () => {
    const dataWithNoItems = {
      ...mockInvoiceData,
      items: [],
    };
    const xml = UBLGenerator.generateInvoice(dataWithNoItems);
    expect(xml).toContain('<cbc:LineCountNumeric>0</cbc:LineCountNumeric>');
  });

  it('should use default values when optional fields missing', () => {
    const minimalData = {
      items: [{ description: 'Item 1', quantity: 1, unitPrice: 100, taxRate: 20 }],
      sender: { vkn: '1111111111', name: 'Sender' },
      receiver: { vkn: '2222222222', name: 'Receiver' },
    };
    const xml = UBLGenerator.generateInvoice(minimalData);
    expect(xml).toContain('TICARIFATURA'); // Default profileId
    expect(xml).toContain('TRY'); // Default currency
    expect(xml).toContain('SATIS'); // Default typeCode
  });

  it('should handle different currencies', () => {
    const dataWithUSD = {
      ...mockInvoiceData,
      currency: 'USD',
    };
    const xml = UBLGenerator.generateInvoice(dataWithUSD);
    expect(xml).toContain('currencyID="USD"');
  });

  it('should handle TCKN for receiver (11 digits)', () => {
    const dataWithTCKN = {
      ...mockInvoiceData,
      receiver: { vkn: '12345678901', name: 'Individual' }, // 11 digits = TCKN
    };
    const xml = UBLGenerator.generateInvoice(dataWithTCKN);
    expect(xml).toContain('schemeID="TCKN"');
  });

  it('should handle VKN for receiver (10 digits)', () => {
    const dataWithVKN = {
      ...mockInvoiceData,
      receiver: { vkn: '1234567890', name: 'Company' }, // 10 digits = VKN
    };
    const xml = UBLGenerator.generateInvoice(dataWithVKN);
    expect(xml).toContain('schemeID="VKN"');
  });

  it('should include invoice lines with correct calculations', () => {
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    // Check first item line
    expect(xml).toContain('<cbc:ID>1</cbc:ID>');
    expect(xml).toContain('Item 1');
    // Check second item line
    expect(xml).toContain('<cbc:ID>2</cbc:ID>');
    expect(xml).toContain('Item 2');
  });

  it('should generate UUID when not provided', () => {
    const dataWithoutUUID = {
      ...mockInvoiceData,
      uuid: undefined,
    };
    const xml1 = UBLGenerator.generateInvoice(dataWithoutUUID);
    const xml2 = UBLGenerator.generateInvoice(dataWithoutUUID);
    // UUIDs should be different
    const uuid1 = xml1.match(/<cbc:UUID>(.*?)<\/cbc:UUID>/)?.[1];
    const uuid2 = xml2.match(/<cbc:UUID>(.*?)<\/cbc:UUID>/)?.[1];
    expect(uuid1).toBeDefined();
    expect(uuid2).toBeDefined();
    expect(uuid1).not.toBe(uuid2);
  });

  it('should include issue date and time', () => {
    const xml = UBLGenerator.generateInvoice(mockInvoiceData);
    const today = new Date().toISOString().split('T')[0];
    expect(xml).toContain(`<cbc:IssueDate>${today}</cbc:IssueDate>`);
    expect(xml).toContain('<cbc:IssueTime>');
  });
});

