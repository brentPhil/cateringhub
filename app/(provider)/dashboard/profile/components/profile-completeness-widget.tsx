"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ProviderProfile } from "../hooks/use-provider-profile";
import {
  computeProfileCompleteness,
  getCompletenessVariant,
} from "../lib/profile-completeness";

interface ProfileCompletenessWidgetProps {
  profile: ProviderProfile | null | undefined;
}

export function ProfileCompletenessWidget({
  profile,
}: ProfileCompletenessWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completeness = computeProfileCompleteness(profile);

  // Hide widget when profile is 100% complete
  if (completeness.percentage === 100) {
    return null;
  }

  const { variant, color, badgeClassName } = getCompletenessVariant(
    completeness.percentage
  );

  const handleScrollToSection = (sectionId?: string) => {
    if (!sectionId) return;

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Add a subtle highlight effect
      element.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 2000);
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Profile completeness</CardTitle>
            <Badge
              variant={variant}
              className={`font-semibold ${badgeClassName}`}
            >
              {completeness.percentage}%
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completeness.completed} of {completeness.total} completed
            </span>
            <span className={`font-medium ${color}`}>
              {completeness.percentage}%
            </span>
          </div>
          <Progress value={completeness.percentage} className="h-2" />
        </div>

        {/* Expandable Checklist */}
        {isExpanded && completeness.missingItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Complete your profile to increase visibility
              </p>
            </div>

            <div className="space-y-2">
              {completeness.missingItems.map((item) => (
                <button
                  key={item.field}
                  type="button"
                  onClick={() => handleScrollToSection(item.sectionId)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isExpanded && completeness.percentage >= 80 && (
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Great job! Your profile is almost complete. Just a few more
                items to go.
              </p>
            </div>
          </div>
        )}

        {/* Warning Message */}
        {isExpanded && completeness.percentage < 50 && (
          <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
            <div className="flex items-start gap-2">
              <Circle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Complete your profile to make it visible to potential customers.
                A complete profile builds trust and increases bookings.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
