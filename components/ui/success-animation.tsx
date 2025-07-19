"use client";

import * as React from "react";
import { Check, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  variant?: "check" | "checkCircle" | "sparkles";
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
  duration?: number; // in milliseconds
  onAnimationComplete?: () => void;
}

export function SuccessAnimation({
  variant = "check",
  size = "md",
  className,
  animate = true,
  duration = 600,
  onAnimationComplete,
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
  };

  const IconComponent = {
    check: Check,
    checkCircle: CheckCircle,
    sparkles: Sparkles,
  }[variant];

  React.useEffect(() => {
    if (animate) {
      setIsAnimating(true);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
    // Return undefined for the else case
    return undefined;
  }, [animate, duration, onAnimationComplete]);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center transition-all duration-300",
        {
          "scale-0 opacity-0": !isVisible,
          "scale-100 opacity-100": isVisible,
          "animate-bounce": isAnimating && variant === "check",
          "animate-pulse": isAnimating && variant === "sparkles",
        },
        className
      )}
    >
      <IconComponent
        className={cn(
          sizeClasses[size],
          "text-green-500 transition-all duration-300",
          {
            "animate-ping": isAnimating && variant === "checkCircle",
          }
        )}
      />
    </div>
  );
}

interface SuccessMessageProps {
  message: string;
  description?: string;
  showIcon?: boolean;
  className?: string;
}

export function SuccessMessage({
  message,
  description,
  showIcon = true,
  className,
}: SuccessMessageProps) {
  const isVisible = true;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg transition-all duration-500",
        {
          "translate-y-2 opacity-0": !isVisible,
          "translate-y-0 opacity-100": isVisible,
        },
        className
      )}
    >
      {showIcon && (
        <SuccessAnimation
          variant="checkCircle"
          size="md"
          animate={animate}
        />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-green-800">{message}</p>
        {description && (
          <p className="text-xs text-green-600 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

interface StepCompletionAnimationProps {
  stepNumber: number;
  stepTitle: string;
  className?: string;
  onComplete?: () => void;
}

export function StepCompletionAnimation({
  stepNumber,
  stepTitle,
  className,
  onComplete,
}: StepCompletionAnimationProps) {
  const phase: "initial" | "checking" | "complete" = "complete";
  React.useEffect(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <div className={cn("flex items-center gap-3 p-4", className)}>
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
          {
            "border-muted-foreground/25 bg-muted": phase === "initial",
            "border-primary bg-primary/10 animate-pulse": phase === "checking",
            "border-green-500 bg-green-500": phase === "complete",
          }
        )}
      >
        {phase === "complete" ? (
          <Check className="w-4 h-4 text-white animate-bounce" />
        ) : (
          <span
            className={cn("text-sm font-medium", {
              "text-muted-foreground": phase === "initial",
              "text-primary": phase === "checking",
            })}
          >
            {stepNumber}
          </span>
        )}
      </div>
      
      <div className="flex-1">
        <p
          className={cn("text-sm font-medium transition-colors duration-300", {
            "text-muted-foreground": phase === "initial",
            "text-primary": phase === "checking",
            "text-green-700": phase === "complete",
          })}
        >
          {stepTitle}
        </p>
        {phase === "complete" && (
          <p className="text-xs text-green-600 animate-fade-in">
            ✓ Completed successfully
          </p>
        )}
      </div>
    </div>
  );
}
