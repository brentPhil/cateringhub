"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StepErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface StepErrorBoundaryProps {
  children: ReactNode;
  stepName: string;
  onRetry?: () => void;
}

export class StepErrorBoundary extends Component<
  StepErrorBoundaryProps,
  StepErrorBoundaryState
> {
  constructor(props: StepErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<StepErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log in development mode
    if (process.env.NODE_ENV === "development") {
      console.error(
        `Step Error Boundary (${this.props.stepName}) caught an error:`,
        error,
        errorInfo
      );
    }

    // Show toast notification
    toast.error(`Error in ${this.props.stepName}. Please try again.`);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  getErrorMessage = (error?: Error): string => {
    if (!error) return "An unexpected error occurred in this step";

    if (error.message.includes("validation")) {
      return "There was an issue with your form data. Please check your inputs and try again.";
    }
    
    if (error.message.includes("file") || error.message.includes("upload")) {
      return "There was an issue with file upload. Please try again with a different file.";
    }

    if (error.message.includes("network") || error.message.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    return "An error occurred while processing this step. Please try again.";
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error in {this.props.stepName}</AlertTitle>
            <AlertDescription className="mt-2">
              {this.getErrorMessage(this.state.error)}
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling step-specific errors
export function useStepErrorHandler(stepName: string) {
  const handleStepError = React.useCallback((error: Error) => {
    // Only log in development mode
    if (process.env.NODE_ENV === "development") {
      console.error(`Step error in ${stepName}:`, error);
    }

    // Handle specific step errors
    if (error.message.includes("validation")) {
      toast.error(`Please check your ${stepName.toLowerCase()} data and try again.`);
      return;
    }

    if (error.message.includes("file") || error.message.includes("upload")) {
      toast.error("File upload failed. Please try again with a smaller file.");
      return;
    }

    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error("Network error. Please check your connection and try again.");
      return;
    }

    // Generic error handling
    toast.error(`An error occurred in ${stepName}. Please try again.`);
  }, [stepName]);

  return { handleStepError };
}
