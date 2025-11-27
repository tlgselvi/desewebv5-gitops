# Code Examples

This document provides code examples in various programming languages for common API operations.

## JavaScript/TypeScript

### Using Fetch API

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';
const token = 'YOUR_JWT_TOKEN';

async function getInvoices() {
  const response = await fetch(`${API_BASE_URL}/finance/invoices`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

async function createInvoice(invoiceData: any) {
  const response = await fetch(`${API_BASE_URL}/finance/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invoiceData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}
```

### Using Axios

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Usage
const invoices = await apiClient.get('/finance/invoices');
const newInvoice = await apiClient.post('/finance/invoices', invoiceData);
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/v1/finance/invoices', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }

        const data = await response.json();
        setInvoices(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, []);

  return { invoices, loading, error };
}
```

## Python

### Using requests

```python
import requests
from typing import Dict, Any

API_BASE_URL = "http://localhost:3000/api/v1"
token = "YOUR_JWT_TOKEN"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def get_invoices():
    response = requests.get(
        f"{API_BASE_URL}/finance/invoices",
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def create_invoice(invoice_data: Dict[str, Any]):
    response = requests.post(
        f"{API_BASE_URL}/finance/invoices",
        headers=headers,
        json=invoice_data
    )
    response.raise_for_status()
    return response.json()

# Usage
invoices = get_invoices()
new_invoice = create_invoice({
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
})
```

### Using httpx (async)

```python
import httpx
from typing import Dict, Any

API_BASE_URL = "http://localhost:3000/api/v1"
token = "YOUR_JWT_TOKEN"

async def get_invoices():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/finance/invoices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        return response.json()

async def create_invoice(invoice_data: Dict[str, Any]):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/finance/invoices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=invoice_data
        )
        response.raise_for_status()
        return response.json()
```

### Python Client Class

```python
import requests
from typing import Dict, Any, Optional

class DeseAPIClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def get_invoices(self):
        return self._request("GET", "/finance/invoices")

    def create_invoice(self, invoice_data: Dict[str, Any]):
        return self._request("POST", "/finance/invoices", json=invoice_data)

    def get_stock_levels(self):
        return self._request("GET", "/inventory/levels")

# Usage
client = DeseAPIClient("http://localhost:3000/api/v1", "YOUR_TOKEN")
invoices = client.get_invoices()
```

## cURL Examples

### Authentication

```bash
# Mock login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@example.com"}'

# Get current user
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Finance

```bash
# Get invoices
curl -X GET http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create invoice
curl -X POST http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid-here",
    "type": "sales",
    "items": [{"description": "Product", "quantity": 1, "unitPrice": 100, "taxRate": 18}]
  }'

# Get dashboard summary
curl -X GET http://localhost:3000/api/v1/finance/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Inventory

```bash
# Get products
curl -X GET http://localhost:3000/api/v1/inventory/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create product
curl -X POST http://localhost:3000/api/v1/inventory/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "sku": "SKU-001",
    "unitPrice": 99.99
  }'

# Get stock levels
curl -X GET http://localhost:3000/api/v1/inventory/levels \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### IoT

```bash
# Get devices
curl -X GET http://localhost:3000/api/v1/iot/devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get telemetry
curl -X GET "http://localhost:3000/api/v1/iot/telemetry/device-uuid?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling Examples

### JavaScript

```typescript
async function handleApiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (error.error) {
        case 'unauthorized':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'forbidden':
          // Show permission error
          alert('You do not have permission to perform this action');
          break;
        case 'validation_error':
          // Show validation errors
          console.error('Validation errors:', error.details);
          break;
        default:
          // Show generic error
          alert(error.message);
      }
      
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // API error
      console.error('API error:', error);
    }
    throw error;
  }
}
```

### Python

```python
import requests
from requests.exceptions import RequestException

def handle_api_request(method: str, url: str, **kwargs):
    try:
        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json()
        error_type = error_data.get('error')
        
        if error_type == 'unauthorized':
            # Redirect to login or refresh token
            print("Authentication required")
        elif error_type == 'forbidden':
            print("Insufficient permissions")
        elif error_type == 'validation_error':
            print("Validation errors:", error_data.get('details'))
        else:
            print("Error:", error_data.get('message'))
        
        raise
    except RequestException as e:
        print("Network error:", str(e))
        raise
```

## Rate Limiting Handling

### JavaScript

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Rate limit exceeded after retries');
}
```

### Python

```python
import time
import requests

def fetch_with_retry(url: str, max_retries: int = 3, **kwargs):
    for i in range(max_retries):
        response = requests.get(url, **kwargs)
        
        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After', 2 ** i)
            time.sleep(int(retry_after))
            continue
        
        response.raise_for_status()
        return response.json()
    
    raise Exception('Rate limit exceeded after retries')
```

