# URL State Management with nuqs in CateringHub

This guide explains how to use nuqs for URL state management in the CateringHub project, and how it integrates with React Query for data fetching.

## Overview

[nuqs](https://nuqs.47ng.com/) is a type-safe search params state manager for React. It allows you to store state in the URL query string, making it easy to create shareable links, support browser history, and maintain state across page refreshes.

Key benefits:
- Type-safe URL state management
- Familiar React.useState-like API
- Seamless integration with React Query
- Support for complex state types (numbers, booleans, arrays, etc.)
- Improved user experience with shareable URLs

## Basic Usage

### Simple State in URL

The most basic usage is similar to React's `useState`, but the state is stored in the URL:

```tsx
"use client";

import { useQueryState } from "nuqs";

function MyComponent() {
  // Similar to useState, but stored in URL as ?name=value
  const [name, setName] = useQueryState("name");
  
  return (
    <>
      <input 
        value={name || ""} 
        onChange={(e) => setName(e.target.value || null)} 
      />
      <p>Hello, {name || "anonymous visitor"}!</p>
    </>
  );
}
```

### Using Different Data Types

nuqs provides parsers for different data types:

```tsx
import { 
  useQueryState, 
  parseAsInteger, 
  parseAsBoolean 
} from "nuqs";

function MyComponent() {
  // Store a number in the URL
  const [count, setCount] = useQueryState("count", parseAsInteger.withDefault(0));
  
  // Store a boolean in the URL
  const [isEnabled, setIsEnabled] = useQueryState(
    "enabled", 
    parseAsBoolean.withDefault(false)
  );
  
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <label>
        <input 
          type="checkbox" 
          checked={isEnabled} 
          onChange={(e) => setIsEnabled(e.target.checked)} 
        />
        Enable feature
      </label>
    </>
  );
}
```

## Integration with React Query

In CateringHub, we've created utility hooks that integrate nuqs with React Query to ensure that when URL parameters change, relevant queries are invalidated.

### Using the Utility Hooks

We provide several utility hooks in `lib/utils/query-state.ts` for common URL state patterns:

#### Pagination

```tsx
import { usePaginationState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have ?page=1&size=10
  const { page, setPage, pageSize, setPageSize } = usePaginationState({
    defaultPage: 1,
    defaultPageSize: 10,
    queryKeys: ["products"] // React Query keys to invalidate when pagination changes
  });
  
  // Use with React Query
  const { data } = useQuery({
    queryKey: ["products", page, pageSize],
    queryFn: () => fetchProducts(page, pageSize)
  });
  
  return (
    <>
      {/* Your UI components */}
      <Pagination 
        currentPage={page} 
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </>
  );
}
```

#### Sorting

```tsx
import { useSortingState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have ?sort=price&order=desc
  const { sortBy, setSortBy, sortOrder, setSortOrder, toggleSortOrder } = useSortingState({
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
    queryKeys: ["products"]
  });
  
  // Use with React Query
  const { data } = useQuery({
    queryKey: ["products", sortBy, sortOrder],
    queryFn: () => fetchProducts({ sortBy, sortOrder })
  });
  
  return (
    <>
      {/* Your UI components */}
      <SortableHeader 
        field="price"
        currentSortField={sortBy}
        currentSortOrder={sortOrder}
        onSort={() => {
          if (sortBy === "price") {
            toggleSortOrder();
          } else {
            setSortBy("price");
          }
        }}
      />
    </>
  );
}
```

#### Filtering

```tsx
import { useFilterState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have filter parameters like ?category=electronics&status=active
  const { filters, setFilter, clearFilters } = useFilterState({
    defaultFilters: {
      category: "",
      status: "active"
    },
    queryKeys: ["products"]
  });
  
  // Use with React Query
  const { data } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters)
  });
  
  return (
    <>
      {/* Your UI components */}
      <FilterDropdown 
        value={filters.category}
        onChange={(value) => setFilter("category", value)}
        options={categoryOptions}
      />
      <Button onClick={clearFilters}>Clear Filters</Button>
    </>
  );
}
```

#### Search

```tsx
import { useSearchState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have ?q=search+term
  const { query, setQuery, clearQuery } = useSearchState({
    queryKeys: ["products"]
  });
  
  // Use with React Query
  const { data } = useQuery({
    queryKey: ["products", query],
    queryFn: () => searchProducts(query)
  });
  
  return (
    <>
      {/* Your UI components */}
      <SearchInput 
        value={query}
        onChange={setQuery}
        onClear={clearQuery}
      />
    </>
  );
}
```

#### View Mode

```tsx
import { useViewModeState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have ?view=grid or ?view=list
  const { viewMode, setViewMode } = useViewModeState(
    ["grid", "list"] as const,
    {
      defaultMode: "grid"
    }
  );
  
  return (
    <>
      {/* Your UI components */}
      <ViewToggle 
        currentView={viewMode}
        onViewChange={setViewMode}
      />
      
      {viewMode === "grid" ? (
        <ProductGrid products={products} />
      ) : (
        <ProductList products={products} />
      )}
    </>
  );
}
```

#### Selected Items

```tsx
import { useSelectedState } from "@/lib/utils/query-state";

function ProductsList() {
  // URL will have ?selected=id1&selected=id2
  const { selected, setSelected, isSelected, toggleSelected, clearSelected } = useSelectedState();
  
  return (
    <>
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          isSelected={isSelected(product.id)}
          onSelect={() => toggleSelected(product.id)}
        />
      ))}
      
      {selected.length > 0 && (
        <>
          <div>Selected: {selected.length} items</div>
          <Button onClick={clearSelected}>Clear Selection</Button>
        </>
      )}
    </>
  );
}
```

## Best Practices

1. **Use the Utility Hooks**: Prefer using the utility hooks in `lib/utils/query-state.ts` over direct usage of `useQueryState` to ensure consistent integration with React Query.

2. **Include Query Keys**: Always include the relevant `queryKeys` option when using the utility hooks to ensure proper cache invalidation.

3. **Provide Default Values**: Always provide default values to avoid dealing with `null` values in your components.

4. **Debounce Search Inputs**: For search inputs, consider using local state with debouncing before updating the URL state to avoid too many URL updates while typing.

5. **Consider URL Length Limits**: Be mindful of URL length limits when storing complex state in the URL. Consider using more compact representations for large data.

6. **Test with Browser Navigation**: Test your components with browser back/forward navigation to ensure a good user experience.

## Resources

- [nuqs Documentation](https://nuqs.47ng.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
