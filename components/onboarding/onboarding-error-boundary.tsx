"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface OnboardingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface OnboardingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
}

export class OnboardingErrorBoundary extends Component<
  OnboardingErrorBoundaryProps,
  OnboardingErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: OnboardingErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<OnboardingErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log in development mode
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Onboarding Error Boundary caught an error:",
        error,
        errorInfo
      );
    }

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show toast notification based on error type
    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error("Network error. Please check your connection and try again.");
    } else if (error.message.includes("validation")) {
      toast.error("Please check your form data and try again.");
    } else if (error.message.includes("authentication")) {
      toast.error("Authentication error. Please log in again.");
    } else {
      toast.error("An error occurred during onboarding. Please try again.");
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached. Please refresh the page.`);
      return;
    }

    this.setState(prevState => ({ 
      hasError: false, 
      retryCount: prevState.retryCount + 1,
      error: undefined,
      errorInfo: undefined
    }));

    // Auto-retry with exponential backoff for network errors
    if (this.state.error?.message.includes("network")) {
      const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
      toast.info(`Retrying in ${delay / 1000} seconds...`);
      
      this.retryTimeoutId = setTimeout(() => {
        this.setState({ hasError: false });
      }, delay);
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleGoBack = () => {
    window.history.back();
  };

  getErrorMessage = (error?: Error): string => {
    if (!error) return "An unexpected error occurred";

    if (error.message.includes("network") || error.message.includes("fetch")) {
      return "Network connection error. Please check your internet connection and try again.";
    }
    
    if (error.message.includes("validation")) {
      return "There was an issue with your form data. Please review your information and try again.";
    }
    
    if (error.message.includes("authentication")) {
      return "Your session has expired. Please log in again to continue.";
    }
    
    if (error.message.includes("file") || error.message.includes("upload")) {
      return "There was an issue uploading your files. Please try again with smaller files or check your connection.";
    }

    return error.message || "An unexpected error occurred during the onboarding process.";
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const maxRetries = this.props.maxRetries || 3;
      const canRetry = this.state.retryCount < maxRetries;

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Onboarding Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  {this.getErrorMessage(this.state.error)}
                </AlertDescription>
              </Alert>

              {this.state.retryCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Retry attempt: {this.state.retryCount} of {maxRetries}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={this.handleRefresh}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleGoBack}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </div>

              <div className="text-center">
                <Link 
                  href="/contact" 
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Need help? Contact support
                </Link>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling onboarding-specific errors
export function useOnboardingErrorHandler() {
  const handleOnboardingError = React.useCallback((error: Error) => {
    // Only log in development mode
    if (process.env.NODE_ENV === "development") {
      console.error("Onboarding error:", error);
    }

    // Handle specific onboarding errors
    if (error.message.includes("file") || error.message.includes("upload")) {
      toast.error("File upload failed. Please try again with a smaller file.");
      return;
    }

    if (error.message.includes("validation")) {
      toast.error("Please check your form data and try again.");
      return;
    }

    if (error.message.includes("provider") && error.message.includes("exists")) {
      toast.error("You are already registered as a provider.");
      return;
    }

    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error("Network error. Please check your connection and try again.");
      return;
    }

    if (error.message.includes("authentication")) {
      toast.error("Session expired. Please log in again.");
      window.location.href = "/login";
      return;
    }

    // Generic error handling
    toast.error("An error occurred during onboarding. Please try again.");
  }, []);

  return { handleOnboardingError };
}
