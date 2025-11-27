# Common Use Cases

This guide provides practical examples for common API operations.

## Finance Module

### Create an Invoice

```bash
curl -X POST http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid-here",
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

### Get Financial Dashboard Summary

```bash
curl -X GET http://localhost:3000/api/v1/finance/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Exchange Rates

```bash
curl -X GET http://localhost:3000/api/v1/finance/exchange-rates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Sync Bank Transactions

```bash
curl -X POST http://localhost:3000/api/v1/finance/bank-sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## CRM Module

### Get Kanban Board

```bash
curl -X GET http://localhost:3000/api/v1/crm/kanban \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Deal

```bash
curl -X POST http://localhost:3000/api/v1/crm/deals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Deal",
    "value": 50000,
    "stageId": "uuid-here",
    "contactId": "uuid-here"
  }'
```

### Move Deal to Another Stage

```bash
curl -X PUT http://localhost:3000/api/v1/crm/deals/{dealId}/stage \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stageId": "new-stage-uuid"
  }'
```

### Send WhatsApp Message

```bash
curl -X POST http://localhost:3000/api/v1/crm/whatsapp/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+905551234567",
    "message": "Hello from CRM!"
  }'
```

## Inventory Module

### Get All Products

```bash
curl -X GET http://localhost:3000/api/v1/inventory/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Product

```bash
curl -X POST http://localhost:3000/api/v1/inventory/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "sku": "SKU-001",
    "description": "Product description",
    "category": "Electronics",
    "unitPrice": 99.99,
    "costPrice": 50.00
  }'
```

### Get Stock Levels

```bash
curl -X GET http://localhost:3000/api/v1/inventory/levels \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Stock Movement

```bash
curl -X POST http://localhost:3000/api/v1/inventory/movements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid-here",
    "warehouseId": "uuid-here",
    "quantity": 10,
    "type": "in",
    "reason": "Purchase"
  }'
```

### Transfer Stock

```bash
curl -X POST http://localhost:3000/api/v1/inventory/transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid-here",
    "fromWarehouseId": "uuid-here",
    "toWarehouseId": "uuid-here",
    "quantity": 5
  }'
```

## IoT Module

### Get All Devices

```bash
curl -X GET http://localhost:3000/api/v1/iot/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Device

```bash
curl -X POST http://localhost:3000/api/v1/iot/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sensor 1",
    "type": "temperature",
    "location": "Warehouse A",
    "metadata": {
      "model": "DHT22"
    }
  }'
```

### Get Device Telemetry

```bash
curl -X GET "http://localhost:3000/api/v1/iot/telemetry/{deviceId}?limit=100&startDate=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get IoT Alerts

```bash
curl -X GET "http://localhost:3000/api/v1/iot/alerts?severity=critical&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## HR Module

### Get All Departments

```bash
curl -X GET http://localhost:3000/api/v1/hr/departments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Department

```bash
curl -X POST http://localhost:3000/api/v1/hr/departments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "description": "Software Engineering Department",
    "managerId": "uuid-here"
  }'
```

### Get All Employees

```bash
curl -X GET "http://localhost:3000/api/v1/hr/employees?departmentId=uuid&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create an Employee

```bash
curl -X POST http://localhost:3000/api/v1/hr/employees \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "departmentId": "uuid-here",
    "position": "Software Engineer",
    "hireDate": "2024-01-15"
  }'
```

### Get Payroll Records

```bash
curl -X GET "http://localhost:3000/api/v1/hr/payrolls?employeeId=uuid&period=2024-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Service Module

### Get Service Requests

```bash
curl -X GET "http://localhost:3000/api/v1/service/requests?status=open&priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create a Service Request

```bash
curl -X POST http://localhost:3000/api/v1/service/requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix HVAC System",
    "description": "HVAC not working in office",
    "priority": "high"
  }'
```

### Assign Technician

```bash
curl -X POST http://localhost:3000/api/v1/service/requests/{requestId}/assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": "uuid-here"
  }'
```

## SEO Module

### Analyze URLs

```bash
curl -X POST http://localhost:3000/api/v1/seo/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid-here",
    "urls": [
      "https://example.com",
      "https://example.com/about"
    ],
    "options": {
      "device": "desktop",
      "throttling": "4G",
      "categories": ["performance", "accessibility", "seo"]
    }
  }'
```

### Get SEO Metrics

```bash
curl -X GET "http://localhost:3000/api/v1/seo/metrics?projectId=uuid&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## CEO Dashboard

### Get Dashboard Summary

```bash
curl -X GET http://localhost:3000/api/v1/ceo/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Dashboard Home (KPIs)

```bash
curl -X GET http://localhost:3000/api/v1/ceo/home \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## AIOps

### Get Anomaly Alerts

```bash
curl -X GET "http://localhost:3000/api/v1/aiops/anomalies/alerts?severity=critical&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Alert Statistics

```bash
curl -X GET "http://localhost:3000/api/v1/aiops/anomalies/alerts/stats?timeRange=24h" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Integrations

### List Integrations

```bash
curl -X GET http://localhost:3000/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Integration

```bash
curl -X POST http://localhost:3000/api/v1/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "isbank",
    "category": "banking",
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret",
    "config": {
      "sandbox": true
    }
  }'
```

### Test Integration Connection

```bash
curl -X POST http://localhost:3000/api/v1/integrations/{integrationId}/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

