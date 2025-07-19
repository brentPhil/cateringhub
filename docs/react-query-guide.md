# React Query (TanStack Query) Guide for CateringHub

This guide explains how to use React Query for data fetching, caching, and state management in the CateringHub project.

## Overview

React Query is a powerful library for managing server state in React applications. It provides hooks for fetching, caching, synchronizing, and updating server state.

Key benefits:
- Automatic caching and background refetching
- Loading and error states
- Pagination and infinite scrolling
- Optimistic updates
- Prefetching
- Mutation handling

## Setup

The React Query provider is set up at the root level in `app/layout.tsx`:

```tsx
<QueryProvider>
  <Toaster />
  {children}
</QueryProvider>
```

## Authentication Hooks

### useUser

Fetches the current authenticated user:

```tsx
const { data: user, isLoading, error } = useUser();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!user) return <div>Not authenticated</div>;

return <div>Hello, {user.email}</div>;
```

### Accessing profile data

Profile information is available on the `user` object returned by `useUser()`:

```tsx
const { data: user, isLoading, error } = useUser();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (!user?.profile) return <div>No profile found</div>;

return <div>Hello, {user.profile.full_name}</div>;
```

### useSignOut

Handles user sign-out:

```tsx
const { mutate: signOut, isPending } = useSignOut();

return (
  <button onClick={() => signOut()} disabled={isPending}>
    {isPending ? "Signing out..." : "Sign out"}
  </button>
);
```

## Generic Data Hooks

### useFetchData

Fetches data from any Supabase table:

```tsx
// Fetch all products
const { data: products, isLoading } = useFetchData<Product[]>(
  "products",
  queryKeys.products,
  {
    order: { column: "created_at", ascending: false },
    limit: 10
  }
);

// Fetch a single product
const { data: product } = useFetchData<Product>(
  "products",
  queryKeys.product(productId),
  {
    filter: { id: productId },
    single: true
  }
);
```

### useInsertData

Inserts data into a Supabase table:

```tsx
const { mutate: createProduct, isPending } = useInsertData<Product>("products");

const handleSubmit = (data) => {
  createProduct(data);
};

return (
  <button onClick={handleSubmit} disabled={isPending}>
    {isPending ? "Creating..." : "Create Product"}
  </button>
);
```

### useUpdateData

Updates data in a Supabase table:

```tsx
const { mutate: updateProduct, isPending } = useUpdateData<Product>("products", productId);

const handleUpdate = (data) => {
  updateProduct(data);
};

return (
  <button onClick={() => handleUpdate({ name: "Updated Name" })} disabled={isPending}>
    {isPending ? "Updating..." : "Update Product"}
  </button>
);
```

### useDeleteData

Deletes data from a Supabase table:

```tsx
const { mutate: deleteProduct, isPending } = useDeleteData("products", productId);

return (
  <button onClick={() => deleteProduct()} disabled={isPending}>
    {isPending ? "Deleting..." : "Delete Product"}
  </button>
);
```

## Best Practices

1. **Use Query Keys Consistently**: Always use the predefined query keys from `queryKeys` to ensure proper cache invalidation.

2. **Handle Loading and Error States**: Always handle loading and error states for a better user experience.

3. **Optimistic Updates**: For a smoother UX, use optimistic updates when appropriate.

4. **Prefetching**: Prefetch data for routes that users are likely to navigate to.

5. **Invalidate Queries Properly**: After mutations, invalidate the relevant queries to ensure data consistency.

## Example: Products Page

```tsx
"use client";

import { useFetchData, useDeleteData, queryKeys } from "@/hooks/use-supabase-query";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { data: products, isLoading, error } = useFetchData<Product[]>(
    "products",
    queryKeys.products
  );

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error loading products: {error.message}</div>;

  return (
    <div>
      <h1>Products</h1>
      <Button onClick={() => router.push("/products/new")}>Add Product</Button>
      
      <div className="grid gap-4 mt-4">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { mutate: deleteProduct, isPending } = useDeleteData("products", product.id);

  return (
    <div className="border p-4 rounded">
      <h2>{product.name}</h2>
      <p>${product.price}</p>
      <p>{product.description}</p>
      <div className="flex gap-2 mt-2">
        <Button onClick={() => router.push(`/products/${product.id}/edit`)}>
          Edit
        </Button>
        <Button 
          variant="destructive" 
          onClick={() => deleteProduct()} 
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}
```
