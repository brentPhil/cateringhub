"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RetryIndicatorProps {
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Retry Indicator Component
 *
 * Displays retry status and progress for network operations.
 * Shows visual feedback during retry attempts with exponential backoff.
 *
 * Features:
 * - Visual retry progress indicator
 * - Network status icon
 * - Retry count display
 * - Manual retry button
 * - Error message display
 *
 * @example
 * ```tsx
 * <RetryIndicator
 *   isRetrying={mutation.isRetrying}
 *   retryCount={mutation.failureCount}
 *   maxRetries={3}
 *   error={mutation.error}
 *   onRetry={() => mutation.reset()}
 * />
 * ```
 */
export function RetryIndicator({
  isRetrying,
  retryCount,
  maxRetries,
  error,
  onRetry,
  className,
}: RetryIndicatorProps) {
  const [progress, setProgress] = React.useState(0);

  // Simulate progress during retry
  React.useEffect(() => {
    if (isRetrying) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isRetrying, retryCount]);

  const isNetworkError =
    error?.message.includes("fetch") ||
    error?.message.includes("network") ||
    error?.message.includes("timeout") ||
    error?.message.includes("Failed to");

  if (!isRetrying && !error) {
    return null;
  }

  return (
    <Alert
      variant={error && !isRetrying ? "destructive" : "default"}
      className={cn("relative", className)}
    >
      <div className="flex items-start gap-3">
        {isRetrying ? (
          <RefreshCw className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
        ) : isNetworkError ? (
          <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        )}

        <div className="flex-1 space-y-2">
          <AlertTitle>
            {isRetrying
              ? `Retrying... (${retryCount}/${maxRetries})`
              : isNetworkError
              ? "Connection error"
              : "Error"}
          </AlertTitle>

          <AlertDescription>
            {isRetrying ? (
              <>
                We're having trouble connecting. Retrying automatically...
                <Progress value={progress} className="h-1 mt-2" />
              </>
            ) : error ? (
              <div className="space-y-2">
                <p>{error.message}</p>
                {isNetworkError && (
                  <p className="text-xs">
                    Please check your internet connection and try again.
                  </p>
                )}
              </div>
            ) : null}
          </AlertDescription>

          {!isRetrying && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Try again
            </Button>
          )}
        </div>

        {isNetworkError && !isRetrying && (
          <div className="shrink-0">
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </Alert>
  );
}

/**
 * Network Status Indicator Component
 *
 * Displays current network connection status.
 * Useful for showing persistent connection issues.
 */
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>No internet connection</AlertTitle>
      <AlertDescription>
        You're currently offline. Please check your internet connection.
      </AlertDescription>
    </Alert>
  );
}

