# External Integrations Guide

**Version:** 1.0.0  
**Last Update:** 2025-01-XX  
**Status:** ✅ Production Ready

---

## Overview

This guide covers the integration of three external services:
1. **E-Fatura (E-Invoice)** - Turkish tax authority invoice system
2. **Banking** - Bank API integrations for transaction synchronization
3. **WhatsApp Business API** - Meta WhatsApp for CRM messaging

---

## 1. E-Fatura Integration (Foriba)

### Setup

1. **Get Foriba Credentials**
   - Register at https://earsiv.foriba.com/
   - Obtain username and password
   - Request test environment access for development

2. **Add to Environment Variables**

```bash
# .env
FORIBA_USERNAME=your_username
FORIBA_PASSWORD=your_password
FORIBA_SANDBOX=true  # Set to false for production
FORIBA_BASE_URL=https://earsiv.foriba.com/EarsivServices  # Optional
```

3. **Configuration in Code**

```typescript
import { ForibaProvider } from '@/integrations/einvoice/foriba.js';

const provider = new ForibaProvider(
  process.env.FORIBA_USERNAME || '',
  process.env.FORIBA_PASSWORD || '',
  {
    sandbox: process.env.FORIBA_SANDBOX === 'true',
    baseUrl: process.env.FORIBA_BASE_URL,
  }
);
```

### API Methods

#### Check E-Invoice User

```typescript
const user = await provider.checkUser('1234567890'); // VKN or TCKN
if (user) {
  console.log('User registered:', user.title);
}
```

#### Send Invoice

```typescript
const invoiceData = {
  sender: {
    vkn: '1111111111',
    name: 'Your Company',
    city: 'Istanbul',
    district: 'Kadikoy',
  },
  receiver: {
    vkn: '1234567890',
    name: 'Customer Company',
    city: 'Istanbul',
    district: 'Besiktas',
  },
  payableAmount: 1000.00,
  currency: 'TRY',
  profileId: 'TICARIFATURA',
  typeCode: 'SATIS',
  items: [
    {
      description: 'Product Name',
      quantity: 1,
      unitPrice: 833.33,
      taxRate: 20,
      unit: 'NIU',
    },
  ],
};

const result = await provider.sendInvoice(invoiceData);
console.log('Invoice sent:', result.uuid, result.status);
```

#### Get Invoice Status

```typescript
const status = await provider.getInvoiceStatus(invoiceUuid);
// Returns: 'queued' | 'processing' | 'sent' | 'approved' | 'rejected'
```

### UBL Generator

The UBL Generator creates compliant UBL-TR 1.2 XML for Turkish tax authority.

**Validation:**

```typescript
import { UBLGenerator } from '@/integrations/einvoice/ubl-generator.js';

const validation = UBLGenerator.validateInvoiceData(invoiceData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

**Generate XML:**

```typescript
const xml = UBLGenerator.generateInvoice(invoiceData);
```

**Check Compliance:**

```typescript
const compliance = UBLGenerator.validateUBLCompliance(xml);
if (!compliance.valid) {
  console.error('Compliance errors:', compliance.errors);
}
```

### Error Handling

All methods use retry mechanism with exponential backoff:
- **Max Retries:** 3
- **Initial Delay:** 1000ms
- **Backoff Multiplier:** 2x

Retryable errors:
- Network errors (ECONNREFUSED, ETIMEDOUT)
- 5xx server errors
- 429 rate limit errors

Non-retryable errors:
- 4xx client errors (400, 401, 404)

### Finance Service Integration

```typescript
import { financeService } from '@/modules/finance/service.js';

// Send e-invoice
const result = await financeService.sendEInvoice(invoiceId, organizationId, 'foriba');

// Check status
const status = await financeService.checkEInvoiceStatus(invoiceId, organizationId);

// Get history
const history = await financeService.getEInvoiceHistory(organizationId, {
  fromDate: new Date('2024-01-01'),
  toDate: new Date(),
  status: 'approved',
  type: 'sales',
});
```

---

## 2. Banking Integration (İşbank)

### Setup

1. **Get İşbank API Credentials**
   - Contact İşbank for API access
   - Obtain API key and secret
   - Request sandbox environment access

2. **Add to Environment Variables**

```bash
# .env
ISBANK_API_KEY=your_api_key
ISBANK_API_SECRET=your_api_secret
ISBANK_SANDBOX=true  # Set to false for production
ISBANK_BASE_URL=https://api.isbank.com.tr/v1  # Optional
```

3. **Configuration in Code**

```typescript
import { IsBankProvider } from '@/integrations/banking/isbank.js';

const provider = new IsBankProvider(
  process.env.ISBANK_API_KEY || '',
  process.env.ISBANK_API_SECRET || '',
  {
    sandbox: process.env.ISBANK_SANDBOX === 'true',
    baseUrl: process.env.ISBANK_BASE_URL,
  }
);
```

### API Methods

#### Get Account Balance

```typescript
const balance = await provider.getBalance('1234567890');
console.log('Balance:', balance);
```

#### Get Transactions

```typescript
const fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 30); // Last 30 days

const transactions = await provider.getTransactions('1234567890', fromDate);
transactions.forEach(tx => {
  console.log(`${tx.date}: ${tx.amount} - ${tx.description}`);
});
```

#### Transfer Money (Havale/EFT)

```typescript
// Same bank transfer (Havale)
const havalRequest = {
  fromAccount: '1234567890',
  toAccount: '0987654321',
  amount: 1000.00,
  currency: 'TRY',
  description: 'Payment for invoice #123',
};

const result = await provider.transfer(havalRequest);
console.log('Transfer:', result.status, result.transactionId);

// Inter-bank transfer (EFT)
const eftRequest = {
  ...havalRequest,
  toBankCode: '64', // Ziraat Bank code
};

const eftResult = await provider.transfer(eftRequest);
```

### Factory Pattern

Use factory for multi-bank support:

```typescript
import { BankProviderFactory } from '@/integrations/banking/factory.js';

const provider = BankProviderFactory.create(
  'isbank',
  apiKey,
  apiSecret,
  { sandbox: true }
);

// List available banks
const banks = BankProviderFactory.getAvailableProviders();
// Returns: ['isbank', 'ziraat', 'garanti']
```

### Finance Service Integration

```typescript
import { financeService } from '@/modules/finance/service.js';

// Sync bank transactions
const result = await financeService.syncBankTransactions(
  organizationId,
  accountId,
  'isbank'
);

console.log(`Synced ${result.syncedCount} transactions`);
console.log(`Matched ${result.matchedCount} to invoices`);
```

**Transaction Matching:**
- Matches bank transactions to invoices by amount (±0.01 tolerance)
- Date range: ±7 days
- Automatically updates invoice status to 'paid' when matched

---

## 3. WhatsApp Business API Integration (Meta)

### Setup

1. **Get Meta WhatsApp Credentials**
   - Create Facebook Business account
   - Set up WhatsApp Business API
   - Get Phone Number ID and Access Token
   - Configure webhook URL

2. **Add to Environment Variables**

```bash
# .env
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_TOKEN=your_access_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_SANDBOX=true  # Set to false for production
```

3. **Webhook Configuration**

Set webhook URL in Meta Developer Console:
```
https://your-domain.com/api/v1/crm/whatsapp/webhook
```

Webhook subscription fields:
- `messages` (for incoming messages)
- `message_status` (for delivery status)

### API Methods

#### Send Text Message

```typescript
import { MetaWhatsAppProvider } from '@/integrations/whatsapp/meta.js';

const provider = new MetaWhatsAppProvider(
  process.env.WHATSAPP_PHONE_ID || '',
  process.env.WHATSAPP_TOKEN || ''
);

const response = await provider.sendMessage({
  to: '+905551234567',
  type: 'text',
  content: 'Hello, this is a test message',
});

console.log('Message ID:', response.messageId);
console.log('Status:', response.status);
```

#### Send Template Message

```typescript
const response = await provider.sendMessage({
  to: '+905551234567',
  type: 'template',
  templateName: 'welcome_template',
  language: 'tr',
  templateParams: [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'John' },
      ],
    },
  ],
});
```

#### Send Media Message

```typescript
// Image
await provider.sendMessage({
  to: '+905551234567',
  type: 'image',
  content: 'Image caption',
  mediaUrl: 'https://example.com/image.jpg',
});

// Document
await provider.sendMessage({
  to: '+905551234567',
  type: 'document',
  content: 'Document caption',
  mediaUrl: 'https://example.com/document.pdf',
});

// Video
await provider.sendMessage({
  to: '+905551234567',
  type: 'video',
  content: 'Video caption',
  mediaUrl: 'https://example.com/video.mp4',
});
```

### CRM Service Integration

```typescript
import { crmWhatsAppService } from '@/modules/crm/whatsapp.service.js';

// Send message to contact
const response = await crmWhatsAppService.sendMessageToContact(
  contactId,
  'Hello from CRM!',
  userId
);

// Get message history
const history = await crmWhatsAppService.getMessageHistory(
  contactId,
  organizationId,
  50 // limit
);
```

### Webhook Handler

The webhook handler is automatically set up at:
```
POST /api/v1/crm/whatsapp/webhook
```

**Webhook Verification (GET):**

Meta will send a GET request to verify the webhook:
```
GET /api/v1/crm/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

**Incoming Messages (POST):**

The handler processes:
- Incoming text/media messages
- Message status updates (sent, delivered, read)
- Creates CRM activities automatically

**Security:**

Webhook signature verification is implemented using HMAC-SHA256:
- Header: `X-Hub-Signature-256`
- Secret: `WHATSAPP_APP_SECRET`

---

## Error Handling & Retry Mechanism

All integrations use a unified retry mechanism:

### Retry Configuration

```typescript
import { retry, isRetryableHttpError } from '@/utils/retry.js';

await retry(
  async () => {
    // Your API call
  },
  {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: isRetryableHttpError,
  }
);
```

### Retryable Errors

- Network errors (ECONNREFUSED, ETIMEDOUT, fetch failed)
- 5xx server errors
- 429 rate limit errors

### Non-Retryable Errors

- 4xx client errors (bad request, unauthorized, not found)
- Validation errors
- Authentication failures

---

## Testing

### Unit Tests

```bash
# Run all integration tests
pnpm test tests/integrations/

# E-Fatura tests
pnpm test tests/integrations/einvoice/

# Banking tests
pnpm test tests/integrations/banking/

# WhatsApp tests
pnpm test tests/integrations/whatsapp/
```

### Sandbox Mode

All providers support sandbox mode for testing:
- Returns mock data
- No actual API calls
- Safe for development

Enable sandbox mode:
```typescript
const provider = new Provider(config, { sandbox: true });
```

---

## Troubleshooting

### E-Fatura Issues

**Problem:** Invoice validation fails
- **Solution:** Check VKN format (10 digits), ensure all required fields are provided

**Problem:** UBL XML not compliant
- **Solution:** Use `UBLGenerator.validateUBLCompliance()` before sending

**Problem:** API timeout
- **Solution:** Increase timeout in retry configuration, check network connectivity

### Banking Issues

**Problem:** Transaction sync duplicates
- **Solution:** Check transaction matching logic, ensure externalId is stored correctly

**Problem:** Transfer fails
- **Solution:** Verify account balance, check bank code for EFT transfers

### WhatsApp Issues

**Problem:** Message not delivered
- **Solution:** Verify phone number format (E.164), check WhatsApp Business account status

**Problem:** Webhook not receiving messages
- **Solution:** Verify webhook URL in Meta Console, check signature verification

**Problem:** Template message fails
- **Solution:** Ensure template is approved in Meta, check template name spelling

---

## Rate Limits

### E-Fatura (Foriba)
- Sandbox: Unlimited
- Production: Check Foriba documentation

### Banking (İşbank)
- Sandbox: Unlimited
- Production: Check İşbank API documentation

### WhatsApp Business API
- Free tier: 1,000 conversations/month
- Business tier: 10,000+ conversations/month
- Rate limits: https://developers.facebook.com/docs/whatsapp/api/rate-limits

---

## Security Best Practices

1. **Store credentials securely**
   - Use environment variables
   - Never commit credentials to git
   - Use secret management services in production

2. **Webhook security**
   - Always verify webhook signatures
   - Use HTTPS for webhook endpoints
   - Implement rate limiting

3. **API keys**
   - Rotate keys regularly
   - Use different keys for sandbox/production
   - Monitor API usage

4. **Error logging**
   - Log errors without exposing sensitive data
   - Don't log full request/response bodies
   - Use structured logging

---

## Support

For issues or questions:
- Check this documentation
- Review error logs
- Contact integration provider support
- Create issue in project repository

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0.0

