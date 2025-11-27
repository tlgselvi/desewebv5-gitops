# Frontend Development Guide - DESE EA PLAN v7.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [DataTable Component](#datatable-component)
7. [Routing](#routing)
8. [Styling](#styling)
9. [Best Practices](#best-practices)

---

## Overview

The DESE EA PLAN v7.0 frontend is built with **Next.js 16** (App Router), **React 19**, and **TypeScript**. It uses **Tailwind CSS v4** for styling and **shadcn/ui** for UI components.

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **React:** 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **State Management:** Zustand (global), React Query (server state)
- **Table Component:** TanStack Table (via DataTable wrapper)

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard pages (protected)
│   │   │   ├── finance/        # Finance module pages
│   │   │   ├── crm/            # CRM module pages
│   │   │   ├── inventory/      # Inventory module pages
│   │   │   ├── hr/             # HR module pages
│   │   │   ├── iot/            # IoT module pages
│   │   │   └── ...
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── data-table/     # DataTable component
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   └── ...                 # Custom components
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   └── auth.ts             # Auth utilities
│   ├── services/               # API service functions
│   │   ├── finance.ts
│   │   ├── crm.ts
│   │   └── ...
│   ├── store/                  # Zustand stores
│   │   └── useStore.ts         # Global state
│   └── types/                  # TypeScript types
│       └── ...
```

---

## Component Architecture

### Page Components

Pages are located in `src/app/dashboard/{module}/page.tsx`:

```typescript
// src/app/dashboard/finance/page.tsx
"use client"

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { financeColumns } from "./columns";
import { getInvoices } from "@/services/finance";

export default function FinancePage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error("Failed to load invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>
      <DataTable
        columns={financeColumns}
        data={invoices}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoices..."
      />
    </div>
  );
}
```

### Column Definitions

Define table columns in `src/app/dashboard/{module}/columns.tsx`:

```typescript
// src/app/dashboard/finance/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  createdAt: string;
};

export const financeColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(amount);
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "paid" ? "success" : "default"}>
          {status}
        </Badge>
      );
    },
  },
];
```

---

## State Management

### Global State (Zustand)

Use Zustand for global state (user, organization, etc.):

```typescript
// src/store/useStore.ts
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

interface Store {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useStore = create<Store>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

Usage in components:

```typescript
import { useStore } from "@/store/useStore";

export default function MyComponent() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);

  // ...
}
```

### Server State (React Query)

For server data, use React Query (optional, can use `useState` + `useEffect`):

```typescript
import { useQuery } from "@tanstack/react-query";
import { getInvoices } from "@/services/finance";

export default function FinancePage() {
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: getInvoices,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading invoices</div>;

  return <DataTable columns={financeColumns} data={invoices} />;
}
```

---

## API Integration

### API Client

Use the `authenticatedFetch` utility from `src/lib/api.ts`:

```typescript
// src/lib/api.ts
import { getToken } from "./auth";

export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

export async function authenticatedPost<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}
```

### Service Functions

Create service functions in `src/services/{module}.ts`:

```typescript
// src/services/finance.ts
import { authenticatedGet, authenticatedPost } from "@/lib/api";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
}

export async function getInvoices(): Promise<Invoice[]> {
  return authenticatedGet<Invoice[]>("/finance/invoices");
}

export async function createInvoice(data: {
  accountId: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
}): Promise<Invoice> {
  return authenticatedPost<Invoice>("/finance/invoices", data);
}
```

### Error Handling

Handle API errors with try/catch:

```typescript
import { toast } from "@/components/ui/use-toast";

const loadInvoices = async () => {
  try {
    setLoading(true);
    const data = await getInvoices();
    setInvoices(data);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to load invoices",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

---

## DataTable Component

The `DataTable` component is a wrapper around TanStack Table with built-in features:

### Basic Usage

```typescript
import { DataTable } from "@/components/ui/data-table/data-table";

<DataTable
  columns={columns}
  data={data}
  searchKey="name" // Column to search in
  searchPlaceholder="Search..."
/>
```

### With Row Click

```typescript
<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  onRowClick={(row) => {
    router.push(`/dashboard/finance/${row.id}`);
  }}
/>
```

### Features

- ✅ Sorting (click column headers)
- ✅ Filtering (search box)
- ✅ Pagination
- ✅ Column visibility toggle
- ✅ Row click handler
- ✅ Responsive design

---

## Routing

### App Router Structure

Next.js 16 uses the App Router. Pages are defined by `page.tsx` files:

```
app/
├── page.tsx              # / (home)
├── login/
│   └── page.tsx          # /login
└── dashboard/
    ├── layout.tsx        # Layout for all dashboard pages
    ├── finance/
    │   └── page.tsx      # /dashboard/finance
    └── crm/
        └── page.tsx      # /dashboard/crm
```

### Navigation

Use Next.js `Link` component:

```typescript
import Link from "next/link";

<Link href="/dashboard/finance">Finance</Link>
```

Or use `useRouter` for programmatic navigation:

```typescript
"use client"

import { useRouter } from "next/navigation";

export default function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/dashboard/finance");
  };

  return <button onClick={handleClick}>Go to Finance</button>;
}
```

### Protected Routes

Protect routes with authentication check:

```typescript
// src/app/dashboard/layout.tsx
"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  return <>{children}</>;
}
```

---

## Styling

### Tailwind CSS

Use Tailwind utility classes:

```typescript
<div className="container mx-auto py-6">
  <h1 className="text-2xl font-bold mb-4">Title</h1>
  <button className="px-4 py-2 bg-blue-500 text-white rounded">
    Click me
  </button>
</div>
```

### shadcn/ui Components

Import and use shadcn/ui components:

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Action</Button>
  </CardContent>
</Card>
```

### Custom Styles

For custom styles, use CSS modules or global CSS:

```typescript
// styles.module.css
.container {
  padding: 1rem;
}

// component.tsx
import styles from "./styles.module.css";

<div className={styles.container}>Content</div>
```

---

## Best Practices

### 1. **Use TypeScript Strictly**
- Define types for all props and data
- Avoid `any` type
- Use interfaces for complex objects

### 2. **Component Organization**
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use composition over inheritance

### 3. **API Calls**
- Use service functions, not direct fetch calls
- Handle errors gracefully
- Show loading states

### 4. **Performance**
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed to children
- Lazy load heavy components

### 5. **Accessibility**
- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works

### 6. **Error Handling**
- Show user-friendly error messages
- Use toast notifications for feedback
- Log errors for debugging

### 7. **State Management**
- Use local state (`useState`) for component-specific state
- Use Zustand for global state (user, theme, etc.)
- Use React Query for server state (optional)

### 8. **Code Organization**
- Group related files together
- Use barrel exports (`index.ts`) for clean imports
- Keep service functions in `services/` directory

---

## Example: Complete Page

See `src/app/dashboard/inventory/page.tsx` for a complete example with:
- DataTable integration
- API service calls
- Error handling
- Loading states
- KPI cards

---

## Questions?

- Check existing pages for patterns
- Review `src/components/ui/` for available components
- See `src/services/` for API integration examples
- Read `ARCHITECTURE.md` for system overview

