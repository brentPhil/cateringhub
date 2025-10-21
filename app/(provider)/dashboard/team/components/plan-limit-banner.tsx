"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpRight } from "lucide-react";

interface PlanLimitBannerProps {
  currentCount: number;
  limit: number;
  onUpgrade?: () => void;
}

export function PlanLimitBanner({
  currentCount,
  limit,
  onUpgrade,
}: PlanLimitBannerProps) {
  // Don't show banner if limit is not reached
  if (currentCount < limit) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Team member limit reached
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex items-center justify-between gap-4">
          <p>
            You&apos;ve reached your plan&apos;s limit of {limit} team members. Upgrade your plan to add more members and unlock additional features.
          </p>
          {onUpgrade && (
            <Button
              onClick={onUpgrade}
              variant="outline"
              size="sm"
              className="shrink-0 border-orange-600 text-orange-900 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-100 dark:hover:bg-orange-900"
            >
              Upgrade plan
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

