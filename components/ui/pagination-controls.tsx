import React from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showInfo?: boolean;
  disabled?: boolean;
  className?: string;
  pageSizeOptions?: number[];
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showInfo = true,
  disabled = false,
  className,
  pageSizeOptions = [5, 10, 20, 50]
}: PaginationControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (value: string) => {
    if (onPageSizeChange) {
      const newPageSize = parseInt(value, 10);
      onPageSizeChange(newPageSize);
      // Reset to first page when changing page size
      onPageChange(1);
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Info section */}
      {showInfo && (
        <div className="flex items-center gap-4">
          <Typography variant="smallText" className="text-muted-foreground">
            Showing {startItem} to {endItem} of {totalItems} results
          </Typography>
          
          {showPageSizeSelector && onPageSizeChange && (
            <div className="flex items-center gap-2">
              <Typography variant="smallText" className="text-muted-foreground">
                Show
              </Typography>
              <Select
                value={pageSize.toString()}
                onValueChange={handlePageSizeChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Typography variant="smallText" className="text-muted-foreground">
                per page
              </Typography>
            </div>
          )}
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1 || disabled}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Typography variant="smallText" className="px-2">
          Page {currentPage} of {totalPages || 1}
        </Typography>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || disabled}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className
}: SimplePaginationProps) {
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousPage}
        disabled={currentPage <= 1 || disabled}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Typography variant="smallText" className="px-4">
        Page {currentPage} of {totalPages || 1}
      </Typography>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextPage}
        disabled={currentPage >= totalPages || disabled}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
