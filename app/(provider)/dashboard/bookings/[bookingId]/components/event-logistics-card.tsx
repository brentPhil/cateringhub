"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, AlertTriangle, Edit, DollarSign } from "lucide-react";
import type {
  BookingDetailData,
  BookingDetailCapabilities,
} from "../../hooks/use-booking-detail";
import {
  canEditLogistics,
  checkConstraintViolations,
  formatCurrency,
} from "../utils/booking-utils";

interface EventLogisticsCardProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
  onEdit?: () => void;
}

export function EventLogisticsCard({
  booking,
  capabilities,
  onEdit,
}: EventLogisticsCardProps) {
  const canEdit = canEditLogistics(capabilities, booking.status);

  // Check for constraint violations
  const violations = checkConstraintViolations(
    booking.event_date,
    booking.created_at,
    booking.providerConstraints
  );

  const hasViolations = violations.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Event logistics</CardTitle>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {/* Constraint violations warning - compact */}
        {hasViolations && (
          <>
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-amber-900">
                    Warnings
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900 mt-1">
                    {violations.map((violation, index) => (
                      <li key={index}>{violation.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Event details - only non-duplicate info */}
        <div className="space-y-2">
          {booking.guest_count && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {booking.guest_count}{" "}
                {booking.guest_count === 1 ? "guest" : "guests"}
              </span>
            </div>
          )}

          {booking.estimated_budget && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {formatCurrency(Number(booking.estimated_budget))}
              </span>
            </div>
          )}
        </div>

        {/* Provider constraints info */}
        {booking.providerConstraints && (
          <>
            <Separator />
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Provider constraints
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {booking.providerConstraints.advanceBookingDays && (
                  <div>
                    <span className="text-muted-foreground">Min. notice:</span>{" "}
                    <span className="font-medium">
                      {booking.providerConstraints.advanceBookingDays} days
                    </span>
                  </div>
                )}
                {booking.providerConstraints.serviceRadius && (
                  <div>
                    <span className="text-muted-foreground">
                      Service radius:
                    </span>{" "}
                    <span className="font-medium">
                      {booking.providerConstraints.serviceRadius} km
                    </span>
                  </div>
                )}
                {booking.providerConstraints.dailyCapacity && (
                  <div>
                    <span className="text-muted-foreground">
                      Daily capacity:
                    </span>{" "}
                    <span className="font-medium">
                      {booking.providerConstraints.dailyCapacity} events
                    </span>
                  </div>
                )}
                {booking.providerConstraints.availableDays &&
                  booking.providerConstraints.availableDays.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Available days:
                      </span>{" "}
                      <span className="font-medium">
                        {booking.providerConstraints.availableDays.join(", ")}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
