# WhatsApp Integration Guide

## Overview

This guide explains how to integrate with WhatsApp Business API (Meta) for sending messages to customers through the CRM module.

## Prerequisites

1. Meta Business Account
2. WhatsApp Business API access
3. Valid organization in Dese EA Plan
4. Integration permissions

## Setup

### 1. Create WhatsApp Integration

```bash
curl -X POST http://localhost:3000/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "meta",
    "category": "whatsapp",
    "apiKey": "your-meta-access-token",
    "apiSecret": "your-phone-number-id",
    "endpointUrl": "https://graph.facebook.com/v18.0",
    "config": {
      "sandbox": true,
      "phoneNumberId": "your-phone-number-id",
      "businessAccountId": "your-business-account-id"
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

## Sending Messages

### Send Text Message

```bash
curl -X POST http://localhost:3000/api/v1/crm/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "message": "Hello! This is a test message from Dese EA Plan."
  }'
```

### Send Template Message

```bash
curl -X POST http://localhost:3000/api/v1/crm/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "template": "order_confirmation",
    "templateParams": {
      "orderNumber": "ORD-12345",
      "customerName": "John Doe"
    }
  }'
```

## Message Types

### Text Messages

Simple text messages for customer communication.

### Template Messages

Pre-approved message templates for:
- Order confirmations
- Shipping notifications
- Appointment reminders
- Payment confirmations

### Media Messages

Send images, documents, or videos (coming soon).

## Phone Number Format

Phone numbers must be in international format:
- **Correct:** `+905551234567`
- **Incorrect:** `0555 123 45 67` or `5551234567`

## Error Handling

### Common Errors

**Invalid Phone Number:**
```json
{
  "error": "invalid_phone_number",
  "message": "Phone number format is invalid"
}
```

**Template Not Approved:**
```json
{
  "error": "template_not_approved",
  "message": "Message template is not approved by Meta"
}
```

**Rate Limit Exceeded:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many messages sent. Please wait."
}
```

**Recipient Not Opted In:**
```json
{
  "error": "recipient_not_opted_in",
  "message": "Recipient has not opted in to receive messages"
}
```

## Best Practices

1. **Get opt-in consent** before sending messages
2. **Use templates** for business messages
3. **Respect rate limits** - Meta has strict limits
4. **Handle opt-outs** gracefully
5. **Personalize messages** when possible
6. **Test in sandbox** before production

## Rate Limits

Meta WhatsApp Business API has rate limits:
- **Tier 1:** 1,000 conversations per 24 hours
- **Tier 2:** 10,000 conversations per 24 hours
- **Tier 3:** 100,000+ conversations per 24 hours

Check your tier in Meta Business Manager.

## Message Status

Track message delivery status:
- `sent` - Message sent to Meta
- `delivered` - Message delivered to recipient
- `read` - Message read by recipient
- `failed` - Message failed to send

## Webhooks

Configure webhooks to receive:
- Message delivery status
- Incoming messages
- Opt-in/opt-out events

Webhook endpoint: `POST /api/v1/crm/whatsapp/webhook`

## Compliance

### Opt-in Requirements

- Customers must opt-in before receiving messages
- Provide clear opt-out instructions
- Honor opt-out requests immediately

### Business Hours

Respect business hours when sending messages:
- Default: 9:00 AM - 6:00 PM (local time)
- Configurable per organization

### Data Privacy

- Comply with GDPR and local regulations
- Don't share customer phone numbers
- Encrypt sensitive data

## Troubleshooting

### Messages Not Sending

1. Verify integration is active and verified
2. Check phone number format
3. Ensure recipient has opted in
4. Review rate limits
5. Check Meta API status

### Template Errors

1. Verify template is approved in Meta
2. Check template parameters match
3. Ensure template language is correct
4. Review template format

### Delivery Failures

1. Check phone number is valid
2. Verify recipient has WhatsApp
3. Ensure number is not blocked
4. Review error messages from Meta

## Support

For Meta WhatsApp API issues, contact Meta Business Support.
For integration issues, check API logs or contact Dese EA Plan support.

