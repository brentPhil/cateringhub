"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressSteps, type Step } from "@/components/ui/progress-steps";
import { SuccessAnimation } from "@/components/ui/success-animation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;

  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  onStepClick?: (step: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isSubmitting?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  showProgress?: boolean;
  progressOrientation?: "horizontal" | "vertical";
  completedSteps?: number[];
  allowStepNavigation?: boolean;
  showSuccessAnimation?: boolean;
  onStepComplete?: (step: number) => void;
}

export function MultiStepForm({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSubmit,
  onStepClick,
  canGoNext,
  canGoPrevious,
  isSubmitting = false,
  children,
  className,
  title,
  description,
  showProgress = true,
  progressOrientation = "horizontal",
  completedSteps: providedCompletedSteps,
  allowStepNavigation = true,
  showSuccessAnimation = true,
  onStepComplete,
}: MultiStepFormProps) {
  const isLastStep = currentStep === steps.length;
  const completedSteps =
    providedCompletedSteps ||
    Array.from({ length: currentStep - 1 }, (_, i) => i + 1);

  const [showingSuccessAnimation, setShowingSuccessAnimation] =
    React.useState(false);
  const [, setAnimatingStep] = React.useState<number | null>(null);

  // Handle step completion animation
  const handleNext = () => {
    if (showSuccessAnimation && canGoNext) {
      setAnimatingStep(currentStep);
      setShowingSuccessAnimation(true);

      setTimeout(() => {
        onNext();
        onStepComplete?.(currentStep);
        setShowingSuccessAnimation(false);
        setAnimatingStep(null);
      }, 1000);
    } else {
      onNext();
      onStepComplete?.(currentStep);
    }
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="text-center mb-8">
          {title && (
            <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
          )}
          {description && (
            <p className="text-muted-foreground text-lg">{description}</p>
          )}
        </div>
      )}

      {/* Progress Steps */}
      {showProgress && (
        <div className="mb-8">
          <ProgressSteps
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            orientation={progressOrientation}
            onStepClick={onStepClick}
            allowStepNavigation={allowStepNavigation}
          />
        </div>
      )}

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{steps[currentStep - 1]?.title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </CardTitle>
          {steps[currentStep - 1]?.description && (
            <p className="text-muted-foreground">
              {steps[currentStep - 1].description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Content */}
          <div className="min-h-[400px]">{children}</div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={!canGoPrevious || isSubmitting}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    !canGoNext || isSubmitting || showingSuccessAnimation
                  }
                  className="min-w-[100px]"
                >
                  {showingSuccessAnimation ? (
                    <>
                      <SuccessAnimation
                        variant="check"
                        size="sm"
                        className="mr-2"
                      />
                      Completed!
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  onClick={onSubmit}
                  disabled={!canGoNext || isSubmitting}
                  className="min-w-[180px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing multi-step form state
export interface UseMultiStepFormProps {
  totalSteps: number;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

export function useMultiStepForm({
  totalSteps,
  initialStep = 1,
  onStepChange,
}: UseMultiStepFormProps) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);

  const goToStep = React.useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
        onStepChange?.(step);
      }
    },
    [totalSteps, onStepChange]
  );

  const nextStep = React.useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const previousStep = React.useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const canGoNext = currentStep < totalSteps;
  const canGoPrevious = currentStep > 1;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return {
    currentStep,
    goToStep,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,
    isFirstStep,
    isLastStep,
  };
}
