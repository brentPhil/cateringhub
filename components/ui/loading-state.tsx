import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "card" | "list" | "table" | "inline";
  count?: number;
  className?: string;
  showFooter?: boolean;
}

interface LoadingCardProps {
  showFooter?: boolean;
  className?: string;
}

function LoadingCard({ showFooter = false, className }: LoadingCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-6 w-1/4 mt-4" />
      </CardContent>
      {showFooter && (
        <CardFooter className="flex justify-between">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      )}
    </Card>
  );
}

function LoadingList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function LoadingTable({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Table header */}
      <div className="flex space-x-4 p-4 border-b">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {/* Table rows */}
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex space-x-4 p-4 border-b">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

function LoadingInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function LoadingState({ 
  variant = "card", 
  count = 3, 
  className,
  showFooter = false 
}: LoadingStateProps) {
  switch (variant) {
    case "card":
      return (
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", 
          className
        )}>
          {Array.from({ length: count }).map((_, index) => (
            <LoadingCard key={index} showFooter={showFooter} />
          ))}
        </div>
      );
    case "list":
      return <LoadingList count={count} className={className} />;
    case "table":
      return <LoadingTable count={count} className={className} />;
    case "inline":
      return <LoadingInline className={className} />;
    default:
      return <LoadingCard showFooter={showFooter} className={className} />;
  }
}

export { LoadingCard, LoadingList, LoadingTable, LoadingInline };
