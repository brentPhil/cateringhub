import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  WifiOff,
  ServerCrash,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  variant?: "alert" | "card" | "page";
  error?: Error | string | null;
  title?: string;
  description?: string;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  onRetry?: () => void;
  onHome?: () => void;
  onBack?: () => void;
  className?: string;
}

function getErrorIcon(error?: Error | string | null) {
  if (!error) return AlertCircle;
  
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return WifiOff;
  }
  if (lowerMessage.includes("server") || lowerMessage.includes("500")) {
    return ServerCrash;
  }
  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized")) {
    return ShieldAlert;
  }
  
  return AlertCircle;
}

function getErrorTitle(error?: Error | string | null, defaultTitle?: string) {
  if (defaultTitle) return defaultTitle;
  if (!error) return "Something went wrong";
  
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Network Error";
  }
  if (lowerMessage.includes("server") || lowerMessage.includes("500")) {
    return "Server Error";
  }
  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized")) {
    return "Access Denied";
  }
  
  return "Error";
}

function getErrorDescription(error?: Error | string | null, defaultDescription?: string) {
  if (defaultDescription) return defaultDescription;
  if (!error) return "An unexpected error occurred. Please try again.";
  
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Please check your internet connection and try again.";
  }
  if (lowerMessage.includes("server") || lowerMessage.includes("500")) {
    return "Our servers are experiencing issues. Please try again later.";
  }
  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized")) {
    return "You don't have permission to access this resource.";
  }
  
  return errorMessage;
}

export function ErrorState({
  variant = "alert",
  error,
  title,
  description,
  showRetry = true,
  showHome = false,
  showBack = false,
  onRetry,
  onHome,
  onBack,
  className
}: ErrorStateProps) {
  const ErrorIcon = getErrorIcon(error);
  const errorTitle = getErrorTitle(error, title);
  const errorDescription = getErrorDescription(error, description);

  if (variant === "alert") {
    return (
      <Alert variant="destructive" className={className}>
        <ErrorIcon className="h-4 w-4" />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription className="mt-2">
          {errorDescription}
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ErrorIcon className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg">{errorTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Typography variant="mutedText">{errorDescription}</Typography>
          <div className="flex flex-col gap-2">
            {showRetry && onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {showHome && onHome && (
              <Button variant="outline" onClick={onHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
            {showBack && onBack && (
              <Button variant="ghost" onClick={onBack} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("min-h-[400px] flex items-center justify-center p-4", className)}>
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ErrorIcon className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <Typography variant="h3">{errorTitle}</Typography>
            <Typography variant="mutedText">{errorDescription}</Typography>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && onRetry && (
              <Button onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {showHome && onHome && (
              <Button variant="outline" onClick={onHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
            {showBack && onBack && (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
