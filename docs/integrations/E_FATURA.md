# E-Fatura Integration Guide

## Overview

This guide explains how to integrate with the E-Fatura (Electronic Invoice) system using the Foriba integration.

## Prerequisites

1. Foriba account and credentials
2. Valid organization in Dese EA Plan
3. Integration permissions

## Setup

### 1. Create Integration

```bash
curl -X POST http://localhost:3000/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "foriba",
    "category": "einvoice",
    "apiKey": "your-foriba-api-key",
    "apiSecret": "your-foriba-api-secret",
    "config": {
      "sandbox": true,
      "environment": "test"
    }
  }'
```

### 2. Test Connection

```bash
curl -X POST http://localhost:3000/api/v1/integrations/{integrationId}/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check E-Invoice User Status

```bash
curl -X GET http://localhost:3000/api/v1/finance/einvoice/check/{vkn} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "vkn": "1234567890",
  "isEInvoiceUser": true,
  "status": "active"
}
```

## Creating E-Invoices

### 1. Create Invoice

First, create an invoice in the system:

```bash
curl -X POST http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "customer-uuid",
    "type": "sales",
    "items": [
      {
        "description": "Product A",
        "quantity": 2,
        "unitPrice": 100.00,
        "taxRate": 18
      }
    ]
  }'
```

### 2. Approve Invoice

```bash
curl -X POST http://localhost:3000/api/v1/finance/invoices/{invoiceId}/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Send to E-Invoice System

The system automatically sends approved invoices to the E-Invoice system if:
- Integration is active and verified
- Customer is an E-Invoice user
- Invoice is in approved status

## Invoice Status

E-Invoice statuses:
- `draft` - Invoice created but not sent
- `sent` - Invoice sent to E-Invoice system
- `delivered` - Invoice delivered to recipient
- `rejected` - Invoice rejected by recipient
- `cancelled` - Invoice cancelled

## Error Handling

### Common Errors

**Integration Not Active:**
```json
{
  "error": "integration_not_active",
  "message": "E-Invoice integration is not active"
}
```

**Customer Not E-Invoice User:**
```json
{
  "error": "not_einvoice_user",
  "message": "Customer is not an E-Invoice user"
}
```

**Invalid Credentials:**
```json
{
  "error": "invalid_credentials",
  "message": "Foriba credentials are invalid"
}
```

## Best Practices

1. **Always test in sandbox** before going to production
2. **Verify customer E-Invoice status** before creating invoices
3. **Handle errors gracefully** - E-Invoice system may be temporarily unavailable
4. **Monitor integration status** regularly
5. **Keep credentials secure** - Never expose API keys in client-side code

## Troubleshooting

### Integration Test Fails

1. Verify Foriba credentials are correct
2. Check network connectivity
3. Ensure sandbox/production environment matches
4. Review integration logs

### Invoice Not Sent

1. Check invoice status (must be approved)
2. Verify customer is E-Invoice user
3. Check integration is active and verified
4. Review error logs

### Invoice Rejected

1. Check invoice data format
2. Verify tax information is correct
3. Ensure customer information matches E-Invoice system
4. Review rejection reason from Foriba

## Support

For Foriba-specific issues, contact Foriba support.
For integration issues, check API logs or contact Dese EA Plan support.

