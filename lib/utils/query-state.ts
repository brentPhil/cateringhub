"use client";

import {
  useQueryState,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  parseAsArrayOf,
  type Parser
} from "nuqs";

// Common sort orders
export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// Common page sizes
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/**
 * Hook to use query state with React Query integration
 * This ensures that when URL parameters change, relevant queries are invalidated
 */
export function useQueryStateWithReactQuery<T>(
  key: string,
  parser: Parser<T>,
  options?: {
    queryKeys?: string[];
    onValueChange?: (value: T) => void;
  }
) {
  const [value, setValue] = useQueryState(key, parser);

  // Invoke callback when value changes; consumers can include the state
  // in their React Query keys instead of manual invalidation.
  if (options?.onValueChange && value !== null) {
    options.onValueChange(value);
  }

  return [value, setValue] as const;
}

/**
 * Hook for pagination state in URL
 */
export function usePaginationState(options?: {
  defaultPage?: number;
  defaultPageSize?: PageSize;
  queryKeys?: string[];
}) {
  const [page, setPage] = useQueryStateWithReactQuery(
    "page",
    parseAsInteger.withDefault(options?.defaultPage || 1),
    { queryKeys: options?.queryKeys }
  );

  const [pageSize, setPageSize] = useQueryStateWithReactQuery(
    "size",
    parseAsInteger.withDefault(options?.defaultPageSize || 10),
    { queryKeys: options?.queryKeys }
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    // Helper to reset pagination
    resetPagination: () => {
      setPage(1);
    }
  };
}

/**
 * Hook for sorting state in URL
 */
export function useSortingState<T extends string>(
  options?: {
    defaultSortBy?: T;
    defaultSortOrder?: SortOrder;
    queryKeys?: string[];
  }
) {
  const [sortBy, setSortBy] = useQueryStateWithReactQuery(
    "sort",
    parseAsString.withDefault(options?.defaultSortBy || "" as T),
    { queryKeys: options?.queryKeys }
  );

  const [sortOrder, setSortOrder] = useQueryStateWithReactQuery(
    "order",
    parseAsStringLiteral(SORT_ORDERS).withDefault(options?.defaultSortOrder || "asc"),
    { queryKeys: options?.queryKeys }
  );

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    // Helper to toggle sort order
    toggleSortOrder: () => {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    },
    // Helper to set sort by and order at once
    setSort: (by: T, order?: SortOrder) => {
      setSortBy(by);
      if (order) {
        setSortOrder(order);
      }
    }
  };
}

/**
 * Hook for filtering state in URL
 *
 * Note: This implementation limits the number of filters to 4 to avoid React Hook rule violations.
 * For more filters, consider using a different approach or creating a custom hook for each filter.
 */
export function useFilterState(
  options?: {
    defaultFilters?: Record<string, string>;
    queryKeys?: string[];
  }
) {
  // We'll use individual query params for each filter
  const filters = options?.defaultFilters || {};
  const filterEntries = Object.entries(filters);

  // Create hooks for up to 4 filters
  // Using empty strings as defaults for non-existent filters
  const [key0, defaultValue0] = filterEntries[0] || ["", ""];
  const [key1, defaultValue1] = filterEntries[1] || ["", ""];
  const [key2, defaultValue2] = filterEntries[2] || ["", ""];
  const [key3, defaultValue3] = filterEntries[3] || ["", ""];

  // Create hooks for each potential filter
  // These will always be called in the same order regardless of how many filters exist
  const [value0, setValue0] = useQueryStateWithReactQuery(
    key0 || "filter0",
    parseAsString.withDefault(defaultValue0),
    { queryKeys: options?.queryKeys }
  );

  const [value1, setValue1] = useQueryStateWithReactQuery(
    key1 || "filter1",
    parseAsString.withDefault(defaultValue1),
    { queryKeys: options?.queryKeys }
  );

  const [value2, setValue2] = useQueryStateWithReactQuery(
    key2 || "filter2",
    parseAsString.withDefault(defaultValue2),
    { queryKeys: options?.queryKeys }
  );

  const [value3, setValue3] = useQueryStateWithReactQuery(
    key3 || "filter3",
    parseAsString.withDefault(defaultValue3),
    { queryKeys: options?.queryKeys }
  );

  // Create an array of filter states for active filters only
  const filterStates: Array<{
    key: string;
    value: string | null;
    setValue: (value: string | null) => void;
  }> = [];

  if (key0) filterStates.push({ key: key0, value: value0, setValue: setValue0 });
  if (key1) filterStates.push({ key: key1, value: value1, setValue: setValue1 });
  if (key2) filterStates.push({ key: key2, value: value2, setValue: setValue2 });
  if (key3) filterStates.push({ key: key3, value: value3, setValue: setValue3 });

  // Create a record of current filter values
  const currentFilters = filterStates.reduce((acc, { key, value }) => {
    acc[key] = value || ""; // Ensure we don't store null values
    return acc;
  }, {} as Record<string, string>);

  // Function to update a specific filter
  const setFilter = (key: string, value: string | null) => {
    const filter = filterStates.find(f => f.key === key);
    if (filter) {
      filter.setValue(value);
    }
  };

  // Function to clear all filters
  const clearFilters = () => {
    filterStates.forEach(({ setValue }) => {
      setValue(null);
    });
  };

  return {
    filters: currentFilters,
    setFilter,
    clearFilters
  };
}

/**
 * Hook for search query state in URL
 */
export function useSearchState(
  options?: {
    defaultQuery?: string;
    queryKeys?: string[];
  }
) {
  const [query, setQuery] = useQueryStateWithReactQuery(
    "q",
    parseAsString.withDefault(options?.defaultQuery || ""),
    { queryKeys: options?.queryKeys }
  );

  return {
    query,
    setQuery,
    clearQuery: () => setQuery("")
  };
}

/**
 * Hook for view mode state in URL (e.g., grid vs list view)
 */
export function useViewModeState<T extends readonly string[]>(
  modes: T,
  options?: {
    defaultMode?: T[number];
    queryKeys?: string[];
  }
) {
  const [viewMode, setViewMode] = useQueryStateWithReactQuery(
    "view",
    parseAsStringLiteral(modes).withDefault(options?.defaultMode || modes[0]),
    { queryKeys: options?.queryKeys }
  );

  return {
    viewMode,
    setViewMode
  };
}

/**
 * Hook for selected items state in URL
 */
export function useSelectedState(
  options?: {
    queryKeys?: string[];
  }
) {
  const [selected, setSelected] = useQueryStateWithReactQuery(
    "selected",
    parseAsArrayOf(parseAsString),
    { queryKeys: options?.queryKeys }
  );

  // Ensure selected is always an array
  const selectedItems: string[] = selected || [];

  return {
    selected: selectedItems,
    setSelected,
    clearSelected: () => setSelected(null),
    isSelected: (id: string) => selectedItems.includes(id),
    toggleSelected: (id: string) => {
      if (selectedItems.includes(id)) {
        setSelected(selectedItems.filter((item: string) => item !== id));
      } else {
        setSelected([...selectedItems, id]);
      }
    }
  };
}
