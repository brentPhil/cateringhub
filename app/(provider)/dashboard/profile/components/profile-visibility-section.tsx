"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileVisibilitySectionProps {
  value: boolean;
  onChange: (value: boolean) => void;
  isLoading?: boolean;
}

export function ProfileVisibilitySection({
  value,
  onChange,
  isLoading,
}: ProfileVisibilitySectionProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-4">
        {isLoading ? (
          <>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="profile-visibility"
                className="text-base font-semibold"
              >
                Profile visibility
              </Label>
              <Switch
                id="profile-visibility"
                checked={value}
                onCheckedChange={onChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Make your profile visible to customers on the platform
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
