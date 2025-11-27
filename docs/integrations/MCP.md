# MCP (Model Context Protocol) Integration Guide

## Overview

This guide explains how to integrate with MCP (Model Context Protocol) servers for AI-powered module interactions.

## What is MCP?

MCP (Model Context Protocol) is a protocol that enables AI agents to interact with various modules (Finance, CRM, IoT, etc.) through standardized interfaces.

## Available MCP Servers

- **FinBot Server** - Finance and accounting operations
- **SalesBot Server** - CRM and sales operations
- **IoTBot Server** - IoT device management
- **HRBot Server** - Human resources operations
- **ServiceBot Server** - Service request management
- **SEOBot Server** - SEO analysis and optimization

## MCP Server Endpoints

Each MCP server runs on a separate port:

- FinBot: `http://localhost:3001/finbot`
- SalesBot: `http://localhost:3002/salesbot`
- IoTBot: `http://localhost:3003/iotbot`
- HRBot: `http://localhost:3004/hrbot`
- ServiceBot: `http://localhost:3005/servicebot`
- SEOBot: `http://localhost:3006/seobot`

## Health Check

Check if an MCP server is running:

```bash
curl -X GET http://localhost:3001/finbot/health
```

Response:
```json
{
  "status": "healthy",
  "service": "finbot-mcp",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## MCP Dashboard

Access the MCP Dashboard to view all servers:

```bash
curl -X GET http://localhost:3000/api/v1/mcp/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response includes:
- Server status
- Available tools
- Server metrics
- Connection information

## Using MCP Servers

### FinBot Example

Query financial data:

```bash
curl -X POST http://localhost:3001/finbot/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the total revenue for this month?",
    "context": {
      "organizationId": "your-org-id"
    }
  }'
```

### SalesBot Example

Get CRM insights:

```bash
curl -X POST http://localhost:3002/salesbot/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me deals closing this week",
    "context": {
      "organizationId": "your-org-id"
    }
  }'
```

## Authentication

MCP servers use the same JWT authentication as the main API:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rate Limiting

MCP servers have rate limits:
- **Window:** 15 minutes
- **Max Requests:** 100 per window per IP

## WebSocket Support

Some MCP servers support WebSocket connections for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/finbot/ws');

ws.on('message', (data) => {
  console.log('Received:', data);
});
```

## Error Handling

MCP servers return errors in a consistent format:

```json
{
  "error": "error_type",
  "message": "Error message",
  "moduleId": "finbot",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Best Practices

1. **Check server health** before making requests
2. **Handle errors gracefully** - servers may be temporarily unavailable
3. **Respect rate limits** - implement retry logic with backoff
4. **Use appropriate server** for your use case
5. **Monitor server status** via dashboard

## Troubleshooting

### Server Not Responding

1. Check if server is running
2. Verify port is correct
3. Check network connectivity
4. Review server logs

### Authentication Errors

1. Verify JWT token is valid
2. Check token hasn't expired
3. Ensure token includes required permissions

### Rate Limit Errors

1. Implement exponential backoff
2. Reduce request frequency
3. Use WebSocket for real-time updates

## Development

### Starting MCP Servers

MCP servers start automatically with the main application, or can be started individually:

```bash
# Start FinBot server
npm run mcp:finbot

# Start all MCP servers
npm run mcp:all
```

### Custom MCP Servers

To create a custom MCP server, see the MCP server template in `src/mcp/`.

## Support

For MCP-specific issues, check:
- MCP Dashboard: `/api/v1/mcp/dashboard`
- Server logs
- API documentation

For integration help, contact Dese EA Plan support.

