import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';

/**
 * UBL-TR 1.2 XML Generator
 * Follows Gelir İdaresi Başkanlığı (GIB) standards.
 */
export class UBLGenerator {
  
  /**
   * Validate invoice data before generating UBL
   */
  static validateInvoiceData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.receiver?.vkn) {
      errors.push('Receiver VKN/TCKN is required');
    }

    if (!data.sender?.vkn) {
      errors.push('Sender VKN is required');
    }

    // Validate VKN format (10 digits for company, 11 for TCKN)
    if (data.receiver?.vkn) {
      const vkn = data.receiver.vkn.toString();
      if (vkn.length !== 10 && vkn.length !== 11) {
        errors.push('Receiver VKN/TCKN must be 10 or 11 digits');
      }
      if (!/^\d+$/.test(vkn)) {
        errors.push('Receiver VKN/TCKN must contain only digits');
      }
    }

    if (data.sender?.vkn) {
      const vkn = data.sender.vkn.toString();
      if (vkn.length !== 10) {
        errors.push('Sender VKN must be 10 digits');
      }
      if (!/^\d+$/.test(vkn)) {
        errors.push('Sender VKN must contain only digits');
      }
    }

    // Validate items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one invoice item is required');
    } else {
      data.items.forEach((item: any, index: number) => {
        if (!item.description) {
          errors.push(`Item ${index + 1}: description is required`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: quantity must be a positive number`);
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: unitPrice must be a non-negative number`);
        }
        if (typeof item.taxRate !== 'number' || item.taxRate < 0 || item.taxRate > 100) {
          errors.push(`Item ${index + 1}: taxRate must be between 0 and 100`);
        }
      });
    }

    // Validate amounts
    if (typeof data.payableAmount !== 'number' || data.payableAmount < 0) {
      errors.push('payableAmount must be a non-negative number');
    }

    // Validate currency code (ISO 4217)
    if (data.currency && !/^[A-Z]{3}$/.test(data.currency)) {
      errors.push('Currency code must be 3 uppercase letters (ISO 4217)');
    }

    // Validate profile ID
    const validProfileIds = ['TICARIFATURA', 'TEMELFATURA', 'YOLCUBERABERFATURA', 'IHRACAT', 'IMPORT'];
    if (data.profileId && !validProfileIds.includes(data.profileId)) {
      errors.push(`ProfileID must be one of: ${validProfileIds.join(', ')}`);
    }

    // Validate type code
    const validTypeCodes = ['SATIS', 'IADE', 'ISTISNA', 'TEVKIFAT', 'OIVK', 'IHRACAT', 'IMPORT'];
    if (data.typeCode && !validTypeCodes.includes(data.typeCode)) {
      errors.push(`TypeCode must be one of: ${validTypeCodes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Generate Invoice XML
   * Validates data and generates UBL-TR 1.2 compliant XML
   */
  static generateInvoice(data: any): string {
    // Validate input data
    const validation = this.validateInvoiceData(data);
    if (!validation.valid) {
      logger.error('[UBLGenerator] Validation failed', { errors: validation.errors, data });
      throw new Error(`UBL validation failed: ${validation.errors.join('; ')}`);
    }

    const uuid = data.uuid || uuidv4();
    const issueDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const issueTime = new Date().toTimeString().split(' ')[0]; // HH:mm:ss
    
    // Tax totals calculation
    const taxTotals = this.calculateTaxTotals(data.items);
    
    // Escape XML content
    const senderName = this.escapeXml(data.sender?.name || 'Gönderici Firma');
    const receiverName = this.escapeXml(data.receiver?.name || 'Alıcı Firma');
    const senderVkn = data.sender?.vkn || '1111111111';
    const receiverVkn = data.receiver?.vkn || '1111111111';
    const receiverSchemeId = receiverVkn.length === 11 ? 'TCKN' : 'VKN';
    const note = this.escapeXml(data.note || '');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
 xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
    <cbc:ProfileID>${data.profileId || 'TICARIFATURA'}</cbc:ProfileID>
    <cbc:ID>${data.id || ''}</cbc:ID>
    <cbc:CopyIndicator>false</cbc:CopyIndicator>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode>${data.typeCode || 'SATIS'}</cbc:InvoiceTypeCode>
    ${note ? `<cbc:Note>${note}</cbc:Note>` : ''}
    <cbc:DocumentCurrencyCode>${data.currency || 'TRY'}</cbc:DocumentCurrencyCode>
    <cbc:LineCountNumeric>${data.items.length}</cbc:LineCountNumeric>
    
    <!-- Accounting Supplier Party (Gönderici) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="VKN">${senderVkn}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${senderName}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:CitySubdivisionName>${this.escapeXml(data.sender?.district || 'Merkez')}</cbc:CitySubdivisionName>
                <cbc:CityName>${this.escapeXml(data.sender?.city || 'İstanbul')}</cbc:CityName>
                <cac:Country>
                    <cbc:Name>Türkiye</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cac:TaxScheme>
                    <cbc:Name>Vergi Dairesi</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <!-- Accounting Customer Party (Alıcı) -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${receiverSchemeId}">${receiverVkn}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${receiverName}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:CitySubdivisionName>${this.escapeXml(data.receiver?.district || 'Merkez')}</cbc:CitySubdivisionName>
                <cbc:CityName>${this.escapeXml(data.receiver?.city || 'İstanbul')}</cbc:CityName>
                <cac:Country>
                    <cbc:Name>Türkiye</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
        </cac:Party>
    </cac:AccountingCustomerParty>
    
    <!-- Tax Total -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${data.currency || 'TRY'}">${taxTotals.totalTax.toFixed(2)}</cbc:TaxAmount>
        ${taxTotals.breakdown.map((t: any) => `
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${data.currency || 'TRY'}">${t.base.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${data.currency || 'TRY'}">${t.amount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:TaxScheme>
                    <cbc:Name>KDV</cbc:Name>
                    <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>`).join('')}
    </cac:TaxTotal>
    
    <!-- Legal Monetary Total -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${data.currency || 'TRY'}">${taxTotals.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${data.currency || 'TRY'}">${taxTotals.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${data.currency || 'TRY'}">${(taxTotals.subtotal + taxTotals.totalTax).toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${data.currency || 'TRY'}">${(taxTotals.subtotal + taxTotals.totalTax).toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <!-- Invoice Lines -->
    ${data.items.map((item: any, index: number) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${item.unit || 'NIU'}">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${data.currency || 'TRY'}">${(item.quantity * item.unitPrice).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${data.currency || 'TRY'}">${(item.quantity * item.unitPrice * (item.taxRate / 100)).toFixed(2)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="${data.currency || 'TRY'}">${(item.quantity * item.unitPrice).toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="${data.currency || 'TRY'}">${(item.quantity * item.unitPrice * (item.taxRate / 100)).toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:Percent>${item.taxRate}</cbc:Percent>
                    <cac:TaxScheme>
                        <cbc:Name>KDV</cbc:Name>
                        <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${this.escapeXml(item.description)}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${data.currency || 'TRY'}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('')}
</Invoice>`;
  }

  /**
   * Validate UBL XML structure (basic compliance check)
   */
  static validateUBLCompliance(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required namespaces
    const requiredNamespaces = [
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    ];

    requiredNamespaces.forEach((ns) => {
      if (!xml.includes(`xmlns="${ns}"`) && !xml.includes(`xmlns:`) && xml.includes(ns)) {
        // Check if namespace is declared
        const nsPrefix = ns.includes('CommonAggregate') ? 'cac' : ns.includes('CommonBasic') ? 'cbc' : '';
        if (nsPrefix && !xml.includes(`xmlns:${nsPrefix}`)) {
          errors.push(`Missing namespace declaration for ${ns}`);
        }
      }
    });

    // Check required elements
    const requiredElements = [
      'UBLVersionID',
      'CustomizationID',
      'ProfileID',
      'UUID',
      'IssueDate',
      'IssueTime',
      'InvoiceTypeCode',
      'DocumentCurrencyCode',
      'AccountingSupplierParty',
      'AccountingCustomerParty',
      'TaxTotal',
      'LegalMonetaryTotal',
    ];

    requiredElements.forEach((element) => {
      const prefix = ['AccountingSupplierParty', 'AccountingCustomerParty', 'TaxTotal', 'LegalMonetaryTotal'].includes(element) ? 'cac' : 'cbc';
      const fullElement = `${prefix}:${element}`;
      if (!xml.includes(`<${fullElement}>`) && !xml.includes(`<${fullElement} `)) {
        errors.push(`Missing required element: ${fullElement}`);
      }
    });

    // Check CustomizationID value (must be TR1.2 for Turkish invoices)
    if (!xml.includes('CustomizationID>TR1.2')) {
      errors.push('CustomizationID must be TR1.2 for Turkish invoices');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static calculateTaxTotals(items: any[]) {
    let subtotal = 0;
    let totalTax = 0;
    const taxBreakdown: Record<number, { base: number, amount: number }> = {};

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineTax = lineTotal * (item.taxRate / 100);
      
      subtotal += lineTotal;
      totalTax += lineTax;

      if (!taxBreakdown[item.taxRate]) {
        taxBreakdown[item.taxRate] = { base: 0, amount: 0 };
      }
      
      // Safe assignment
      const current = taxBreakdown[item.taxRate];
      if (current) {
        current.base += lineTotal;
        current.amount += lineTax;
      }
    });

    return {
      subtotal,
      totalTax,
      breakdown: Object.entries(taxBreakdown).map(([rate, val]) => ({
        rate: Number(rate),
        base: val.base,
        amount: val.amount
      }))
    };
  }
}
