"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

interface AvailabilitySectionProps {
  dailyCapacity: number;
  advanceBookingDays: number;
  selectedDays: string[];
  onDailyCapacityChange: (value: number) => void;
  onAdvanceBookingDaysChange: (value: number) => void;
  onSelectedDaysChange: (value: string[]) => void;
  isLoading?: boolean;
}

export function AvailabilitySection({
  dailyCapacity,
  advanceBookingDays,
  selectedDays,
  onDailyCapacityChange,
  onAdvanceBookingDaysChange,
  onSelectedDaysChange,
  isLoading,
}: AvailabilitySectionProps) {
  const toggleDay = React.useCallback(
    (day: string) => {
      const newSelectedDays = selectedDays.includes(day)
        ? selectedDays.filter((d) => d !== day)
        : [...selectedDays, day];

      onSelectedDaysChange(newSelectedDays);
    },
    [selectedDays, onSelectedDaysChange]
  );

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-28" />
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full rounded" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full rounded" />
                <Skeleton className="h-3 w-60" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-16" />
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4">
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className=" w-full aspect-[3/4]" />
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold">Availability</h3>

            {/* Daily Capacity */}
            <div className="space-y-2">
              <Label className="text-sm">Daily capacity</Label>
              <Slider
                value={[dailyCapacity]}
                onValueChange={(value) => onDailyCapacityChange(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum events per day: {dailyCapacity}{" "}
                {dailyCapacity === 1 ? "event" : "events"}
              </p>
            </div>

            {/* Advance Booking */}
            <div className="space-y-2">
              <Label className="text-sm">Advance booking</Label>
              <Slider
                value={[advanceBookingDays]}
                onValueChange={(value) => onAdvanceBookingDaysChange(value[0])}
                max={30}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum notice required: {advanceBookingDays}{" "}
                {advanceBookingDays === 1 ? "day" : "days"} in advance
              </p>
            </div>

            {/* Weekly Schedule */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Weekly</Label>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label
                      htmlFor={day}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range Calendar Placeholder */}
            <div className="pt-4">
              <Label className="text-sm font-medium mb-3 block">
                Date range calendar
              </Label>
              <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">
                  Calendar component
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
