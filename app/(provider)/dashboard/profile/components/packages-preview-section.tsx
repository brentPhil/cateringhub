"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

export interface Package {
  id: number;
  name: string;
  description: string;
  price: number;
}

interface PackagesPreviewSectionProps {
  packages: Package[];
  isLoading?: boolean;
  onManageClick?: () => void;
  showAddCard?: boolean;
}

export function PackageCard({ package: pkg }: { package: Package }) {
  return (
    <Card className="bg-muted/30 border-border hover:border-primary/50 transition-colors">
      <CardContent className="p-6 space-y-4">
        <div className="aspect-video bg-muted rounded-lg" />
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{pkg.name}</h3>
          <p className="text-xs text-muted-foreground">{pkg.description}</p>
          <p className="text-lg font-bold">₱{pkg.price.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageCardSkeleton() {
  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="aspect-video w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PackagesPreviewSection({
  packages,
  isLoading,
  onManageClick,
  showAddCard = true,
}: PackagesPreviewSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const pkgList = Array.isArray(packages) ? packages : [];
  const showToggle = pkgList.length > 3;
  const visiblePackages = expanded ? pkgList : pkgList.slice(0, 3);

  // trigger a subtle fade-in for newly revealed cards
  React.useEffect(() => {
    if (expanded) {
      setIsAnimating(true);
      const t = setTimeout(() => setIsAnimating(false), 50);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-40" />
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Packages preview</h2>
            <Button variant="outline" size="sm" onClick={onManageClick}>
              <Plus className="w-4 h-4 mr-2" />
              Manage packages
            </Button>
          </>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <PackageCardSkeleton key={i} />
          ))}
        </div>
      ) : pkgList.length === 0 ? (
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No packages yet</p>
            <div>
              <Button variant="outline" size="sm" onClick={onManageClick}>
                <Plus className="w-4 h-4 mr-2" />
                Manage packages
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visiblePackages.map((pkg, idx) => {
              const beyondFirstThree = expanded && idx >= 3;
              return (
                <div
                  key={pkg.id}
                  className={
                    "transition-opacity duration-300 " +
                    (beyondFirstThree && isAnimating
                      ? "opacity-0"
                      : "opacity-100")
                  }
                >
                  <PackageCard package={pkg} />
                </div>
              );
            })}

            {/* Add package card */}
            {showAddCard && (!expanded ? visiblePackages.length < 3 : true) && (
              <button
                type="button"
                onClick={onManageClick}
                title="Add package"
                aria-label="Add package"
                className="bg-muted/30 border border-border hover:border-primary/50 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <div className="p-6 h-full">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              </button>
            )}
          </div>

          {showToggle && (
            <div className="flex justify-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((s) => !s)}
                className="group"
              >
                {expanded ? (
                  <>
                    Show less
                    <ChevronUp className="w-4 h-4 ml-2 transition-transform group-hover:-translate-y-0.5" />
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="w-4 h-4 ml-2 transition-transform group-hover:translate-y-0.5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
