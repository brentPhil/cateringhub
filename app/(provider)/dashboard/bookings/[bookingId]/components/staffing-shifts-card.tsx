"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { ShiftList } from "@/components/shifts/shift-list";
import { AssignTeammateDialog } from "@/components/shifts/assign-teammate-dialog";
import { useShifts } from "../../hooks/use-shifts";
import type { BookingDetailData, BookingDetailCapabilities } from "../../hooks/use-booking-detail";
import { calculateLaborCost, formatCurrency } from "../utils/booking-utils";

interface StaffingShiftsCardProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
  providerId: string;
}

export function StaffingShiftsCard({
  booking,
  capabilities,
  providerId,
}: StaffingShiftsCardProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Fetch shifts for this booking
  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
  } = useShifts(booking.id);

  const canManage = capabilities.canAssign;

  // Calculate metrics from shift aggregates
  const { totalShifts, estimatedHours, actualHours } = booking.shiftAggregates;
  const estimatedCost = calculateLaborCost(estimatedHours);
  const actualCost = calculateLaborCost(actualHours);

  const hasShifts = totalShifts > 0;
  const hasActualHours = actualHours > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Staffing & shifts</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Metrics summary */}
          {hasShifts && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total shifts */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Team members
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{totalShifts}</div>
                </div>

                {/* Estimated hours */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Est. hours
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {estimatedHours.toFixed(1)}
                  </div>
                </div>

                {/* Actual hours */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Actual hours
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {hasActualHours ? actualHours.toFixed(1) : "—"}
                  </div>
                </div>

                {/* Estimated cost */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Est. labor cost
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(estimatedCost)}
                  </div>
                </div>
              </div>

              {/* Actual cost comparison */}
              {hasActualHours && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Actual labor cost
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">
                        {formatCurrency(actualCost)}
                      </div>
                      {actualCost !== estimatedCost && (
                        <Badge
                          variant={
                            actualCost > estimatedCost ? "destructive" : "default"
                          }
                        >
                          {actualCost > estimatedCost ? "+" : ""}
                          {formatCurrency(actualCost - estimatedCost)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />
            </>
          )}

          {/* Shift list */}
          <ShiftList
            bookingId={booking.id}
            shifts={shifts}
            isLoading={isLoading}
            isError={isError}
            error={error}
            canManage={canManage}
            onAssignClick={() => setAssignDialogOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Assign teammate dialog */}
      <AssignTeammateDialog
        bookingId={booking.id}
        providerId={providerId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </>
  );
}

