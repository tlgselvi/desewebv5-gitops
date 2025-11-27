# Banking Integration Guide

## Overview

This guide explains how to integrate with banking systems (e.g., İşbank) for transaction synchronization and account management.

## Supported Banks

- İşbank (İş Bankası)
- More banks coming soon

## Prerequisites

1. Banking API credentials from your bank
2. Valid organization in Dese EA Plan
3. Integration permissions
4. Bank account access

## Setup

### 1. Create Banking Integration

```bash
curl -X POST http://localhost:3000/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "isbank",
    "category": "banking",
    "apiKey": "your-bank-api-key",
    "apiSecret": "your-bank-api-secret",
    "endpointUrl": "https://api.isbank.com.tr",
    "config": {
      "sandbox": true,
      "accountNumbers": ["1234567890"]
    }
  }'
```

### 2. Test Connection

```bash
curl -X POST http://localhost:3000/api/v1/integrations/{integrationId}/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Verify Integration

Check integration status:

```bash
curl -X GET http://localhost:3000/api/v1/integrations/{integrationId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Synchronizing Transactions

### Manual Sync

Trigger a manual synchronization:

```bash
curl -X POST http://localhost:3000/api/v1/finance/bank-sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "syncedAccounts": 2,
  "newTransactions": 15,
  "updatedTransactions": 3,
  "syncTime": "2024-01-15T10:30:00Z"
}
```

### Automatic Sync

Bank transactions are automatically synchronized:
- Daily at 2:00 AM (configurable)
- After successful integration setup
- When integration is verified

## Transaction Data

Synchronized transactions include:
- Transaction date
- Amount
- Description
- Account number
- Transaction type (debit/credit)
- Reference number
- Balance after transaction

## Account Management

### Get Account Balances

```bash
curl -X GET http://localhost:3000/api/v1/finance/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Account Transactions

```bash
curl -X GET "http://localhost:3000/api/v1/finance/transactions?accountId=uuid&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling

### Common Errors

**Connection Failed:**
```json
{
  "error": "connection_failed",
  "message": "Unable to connect to banking API"
}
```

**Invalid Credentials:**
```json
{
  "error": "invalid_credentials",
  "message": "Banking API credentials are invalid"
}
```

**Account Not Found:**
```json
{
  "error": "account_not_found",
  "message": "Specified account not found"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests to banking API"
}
```

## Security Best Practices

1. **Encrypt credentials** - API keys and secrets are encrypted at rest
2. **Use sandbox** for testing
3. **Rotate credentials** regularly
4. **Monitor access logs** for suspicious activity
5. **Limit account access** to necessary accounts only
6. **Use read-only credentials** when possible

## Rate Limits

Banking APIs typically have rate limits:
- **İşbank:** 100 requests per minute
- Adjust sync frequency accordingly

## Troubleshooting

### Sync Fails

1. Verify banking API credentials
2. Check network connectivity
3. Ensure account numbers are correct
4. Review integration logs
5. Check bank API status

### Missing Transactions

1. Verify date range is correct
2. Check account numbers match
3. Ensure sync job is running
4. Review transaction filters

### Duplicate Transactions

1. System automatically prevents duplicates
2. Check transaction reference numbers
3. Review sync logs for issues

## Compliance

### Data Retention

- Transaction data is retained per your organization's policy
- Comply with local banking regulations
- Follow GDPR/data protection requirements

### Audit Logging

All banking operations are logged:
- Sync operations
- Account access
- Transaction retrieval
- Credential changes

## Support

For bank-specific API issues, contact your bank's API support.
For integration issues, check API logs or contact Dese EA Plan support.

