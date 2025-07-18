"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
}

export interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  onStepClick?: (step: number) => void;
  allowStepNavigation?: boolean;
}

export function ProgressSteps({
  steps,
  currentStep,
  completedSteps = [],
  className,
  orientation = "horizontal",
  size = "md",
  onStepClick,
  allowStepNavigation = false,
}: ProgressStepsProps) {
  const sizeClasses = {
    sm: {
      circle: "w-6 h-6 text-xs",
      title: "text-sm",
      description: "text-xs",
    },
    md: {
      circle: "w-8 h-8 text-sm",
      title: "text-base",
      description: "text-sm",
    },
    lg: {
      circle: "w-10 h-10 text-base",
      title: "text-lg",
      description: "text-base",
    },
  };

  const classes = sizeClasses[size];

  if (orientation === "vertical") {
    return (
      <div className={cn("space-y-4", className)}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep && !isCompleted;

          const canNavigate =
            allowStepNavigation && (isCompleted || isCurrent) && onStepClick;
          const stepContent = (
            <>
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 font-medium transition-colors",
                  classes.circle,
                  {
                    "bg-primary border-primary text-primary-foreground":
                      isCompleted || isCurrent,
                    "bg-muted border-muted-foreground/25 text-muted-foreground":
                      isPending,
                  },
                  canNavigate && "cursor-pointer hover:scale-105"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-medium",
                    classes.title,
                    {
                      "text-primary": isCurrent,
                      "text-foreground": isCompleted,
                      "text-muted-foreground": isPending,
                    },
                    canNavigate && "cursor-pointer hover:text-primary"
                  )}
                >
                  {step.title}
                  {step.optional && (
                    <span className="ml-1 text-muted-foreground">
                      (optional)
                    </span>
                  )}
                </div>
                {step.description && (
                  <div
                    className={cn(
                      "text-muted-foreground mt-1",
                      classes.description
                    )}
                  >
                    {step.description}
                  </div>
                )}
              </div>
            </>
          );

          return (
            <div key={step.id} className="flex items-start space-x-3">
              {canNavigate ? (
                <div
                  className="flex items-start space-x-3 cursor-pointer transition-all hover:bg-muted/50 rounded-lg p-2 -m-2"
                  onClick={() => onStepClick(stepNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onStepClick(stepNumber);
                    }
                  }}
                >
                  {stepContent}
                </div>
              ) : (
                stepContent
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.includes(stepNumber);
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep && !isCompleted;
        const isLast = index === steps.length - 1;

        const canNavigate =
          allowStepNavigation && (isCompleted || isCurrent) && onStepClick;
        const stepContent = (
          <>
            {/* Step Circle */}
            <div
              className={cn(
                "flex items-center justify-center rounded-full border-2 font-medium transition-colors",
                classes.circle,
                {
                  "bg-primary border-primary text-primary-foreground":
                    isCompleted || isCurrent,
                  "bg-muted border-muted-foreground/25 text-muted-foreground":
                    isPending,
                },
                canNavigate && "cursor-pointer hover:scale-105"
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{stepNumber}</span>
              )}
            </div>

            {/* Step Content */}
            <div className="text-center">
              <div
                className={cn(
                  "font-medium",
                  classes.title,
                  {
                    "text-primary": isCurrent,
                    "text-foreground": isCompleted,
                    "text-muted-foreground": isPending,
                  },
                  canNavigate && "cursor-pointer hover:text-primary"
                )}
              >
                {step.title}
                {step.optional && (
                  <span className="ml-1 text-muted-foreground text-xs">
                    (optional)
                  </span>
                )}
              </div>
            </div>
          </>
        );

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center space-y-2">
              {canNavigate ? (
                <div
                  className="flex flex-col items-center space-y-2 cursor-pointer transition-all hover:bg-muted/50 rounded-lg p-2 -m-2"
                  onClick={() => onStepClick(stepNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onStepClick(stepNumber);
                    }
                  }}
                >
                  {stepContent}
                </div>
              ) : (
                stepContent
              )}
              {step.description && (
                <div
                  className={cn(
                    "text-muted-foreground mt-1 max-w-24",
                    classes.description
                  )}
                >
                  {step.description}
                </div>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn("flex-1 h-0.5 mx-4 transition-colors", {
                  "bg-primary":
                    isCompleted || (isCurrent && index < currentStep - 1),
                  "bg-muted":
                    isPending || (isCurrent && index >= currentStep - 1),
                })}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
