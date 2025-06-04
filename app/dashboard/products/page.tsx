"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // Simulate loading and data processing
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate API call delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!query) return mockProducts;
    return mockProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, mockProducts]);

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

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput || null);
  };

  // Calculate total pages
  const totalPages = useMemo(() => {
    const pageSizeNum = typeof pageSize === "number" ? pageSize : 10;
    return processedData
      ? Math.ceil(processedData.totalCount / pageSizeNum)
      : 0;
  }, [processedData, pageSize]);

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
        <Button>
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
            onChange={(e) => setSearchInput(e.target.value)}
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
              onClick={() => setViewMode("grid")}
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
              onClick={() => setViewMode("list")}
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

      {/* Loading state with skeletons */}
      {isLoading && (
        <div
          className={
            viewModeStr === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          }
        >
          {Array.from({ length: Math.min(pageSizeNum, 3) }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-6 w-1/4 mt-4" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load products: {(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {/* Products grid/list */}
      {!isLoading && processedData && (
        <>
          {processedData.products.length === 0 ? (
            <div className="text-center py-8">
              <Typography variant="h5">No products found</Typography>
              <Typography variant="mutedText">
                Try adjusting your search or filters
              </Typography>
            </div>
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
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <Select
                value={pageSizeNum.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Typography variant="smallText">
                Showing {processedData.products.length} of{" "}
                {processedData.totalCount} products
              </Typography>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(pageNum - 1)}
                disabled={pageNum <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Typography variant="smallText">
                Page {pageNum} of {totalPagesNum || 1}
              </Typography>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(pageNum + 1)}
                disabled={pageNum >= totalPagesNum}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
