"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { IS_DEV } from "@/lib/constants";
import {
  usePaginationState,
  useSortingState,
  useSearchState,
  useViewModeState,
} from "@/lib/utils/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { LayoutGrid, List, Search, ArrowUpDown, Plus } from "lucide-react";

// Define product type
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  created_at: string;
}

// Define the response type

export default function ProductsPage() {
  // URL state for pagination
  const { page, setPage, pageSize, setPageSize } = usePaginationState({
    defaultPage: 1,
    defaultPageSize: 10,
    queryKeys: ["products"],
  });

  // URL state for sorting
  const { sortBy, setSortBy, sortOrder, toggleSortOrder } =
    useSortingState<string>({
      defaultSortBy: "created_at",
      defaultSortOrder: "desc",
      queryKeys: ["products"],
    });

  // URL state for search
  const { query, setQuery } = useSearchState({
    queryKeys: ["products"],
  });

  // URL state for view mode (grid or list)
  const { viewMode, setViewMode } = useViewModeState(
    ["grid", "list"] as const,
    {
      defaultMode: "grid",
      queryKeys: ["products"],
    }
  );

  // Local state for search input (to avoid too many URL updates while typing)
  const [searchInput, setSearchInput] = useState(query ? query : "");

  // Mock data for products (since products table doesn't exist in database)
  const mockProducts: Product[] = useMemo(
    () => [
      {
        id: "1",
        name: "Gourmet Sandwich Platter",
        description: "Assorted gourmet sandwiches with premium ingredients",
        price: 89.99,
        category: "Catering",
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Mediterranean Mezze Box",
        description: "Traditional Mediterranean appetizers and dips",
        price: 65.5,
        category: "Appetizers",
        created_at: new Date().toISOString(),
      },
      {
        id: "3",
        name: "BBQ Feast Package",
        description: "Slow-cooked BBQ meats with classic sides",
        price: 125.0,
        category: "Main Course",
        created_at: new Date().toISOString(),
      },
    ],
    []
  );

  // Simulate fetching products
  const {
    data: fetchedProducts = mockProducts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products", "mock"],
    queryFn: () =>
      new Promise<Product[]>((resolve) =>
        setTimeout(() => resolve(mockProducts), 1000)
      ),
  });

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!query) return fetchedProducts;
    return fetchedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, fetchedProducts]);

  // Process the data to match the expected format
  const processedData = useMemo(() => {
    if (isLoading) return null;

    // Apply pagination to filtered products
    const pageNum = typeof page === "number" ? page : 1;
    const pageSizeNum = typeof pageSize === "number" ? pageSize : 10;
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;

    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      products: paginatedProducts,
      totalCount: filteredProducts.length,
    };
  }, [filteredProducts, page, pageSize, isLoading]);

  // Handle search form submission - memoized to prevent unnecessary re-renders
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setQuery(searchInput || null);
    },
    [searchInput, setQuery]
  );

  // Calculate total pages
  const totalPages = useMemo(() => {
    const pageSizeNum = typeof pageSize === "number" ? pageSize : 10;
    return processedData
      ? Math.ceil(processedData.totalCount / pageSizeNum)
      : 0;
  }, [processedData, pageSize]);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    [setSearchInput]
  );

  const handleGridViewClick = useCallback(() => {
    setViewMode("grid");
  }, [setViewMode]);

  const handleListViewClick = useCallback(() => {
    setViewMode("list");
  }, [setViewMode]);

  const handleAddProduct = useCallback(() => {
    if (IS_DEV) console.log("Add product clicked");
  }, []);

  // Convert state values to proper types for rendering
  const pageNum = typeof page === "number" ? page : 1;
  const pageSizeNum = typeof pageSize === "number" ? pageSize : 10;
  const sortByStr = typeof sortBy === "string" ? sortBy : "created_at";
  const viewModeStr = typeof viewMode === "string" ? viewMode : "grid";
  const searchInputStr = typeof searchInput === "string" ? searchInput : "";
  const totalPagesNum = typeof totalPages === "number" ? totalPages : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h4">Products</Typography>
        <Button onClick={handleAddProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
          <Input
            placeholder="Search products..."
            value={searchInputStr}
            onChange={handleSearchInputChange}
            className="w-full md:w-80"
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-md border border-input">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-r-none ${
                viewModeStr === "grid" ? "bg-muted" : ""
              }`}
              onClick={handleGridViewClick}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-l-none ${
                viewModeStr === "list" ? "bg-muted" : ""
              }`}
              onClick={handleListViewClick}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort selector */}
          <Select value={sortByStr} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="created_at">Date Added</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort order toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            aria-label={`Sort ${
              sortOrder === "asc" ? "Ascending" : "Descending"
            }`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <LoadingState
          variant={viewModeStr === "grid" ? "card" : "list"}
          count={Math.min(pageSizeNum, 6)}
          showFooter={true}
        />
      )}

      {/* Error state */}
      {error && (
        <ErrorState
          variant="alert"
          error={error}
          showRetry={true}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Products grid/list */}
      {!isLoading && processedData && (
        <>
          {processedData.products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your search or filters to find what you're looking for."
              actionLabel="Add Product"
              onAction={handleAddProduct}
              variant="page"
            />
          ) : (
            <div
              className={
                viewModeStr === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }
            >
              {processedData.products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>{product.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{product.description}</p>
                    <p className="mt-2 font-bold">
                      ${product.price.toFixed(2)}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                    <Button size="sm">Add to Cart</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-6">
            <PaginationControls
              currentPage={pageNum}
              totalPages={totalPagesNum}
              pageSize={pageSizeNum}
              totalItems={processedData.totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              showPageSizeSelector={true}
              showInfo={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
