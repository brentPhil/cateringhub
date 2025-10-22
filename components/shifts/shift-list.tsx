"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Clock, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { createShiftColumns } from "./shift-columns";
import type { ShiftWithUser } from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";

interface ShiftListProps {
  bookingId: string;
  shifts: ShiftWithUser[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  canManage: boolean;
  onAssignClick: () => void;
}

export function ShiftList({
  bookingId,
  shifts,
  isLoading,
  isError,
  error,
  canManage,
  onAssignClick,
}: ShiftListProps) {
  const columns = React.useMemo(
    () => createShiftColumns({ bookingId, canManage }),
    [bookingId, canManage]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-destructive/10">
        <AlertCircle className="h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-semibold mb-1">Failed to load shifts</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {error?.message ||
            "An error occurred while loading team assignments."}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          Reload page
        </Button>
      </div>
    );
  }

  // Empty state
  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
        <Clock className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">No team members assigned</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Assign team members to this booking to track attendance and manage
          shifts.
        </p>
        {canManage && (
          <Button onClick={onAssignClick} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Assign team member
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with assign button */}
      {canManage && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {shifts.length}{" "}
            {shifts.length === 1 ? "team member" : "team members"} assigned
          </p>
          <Button onClick={onAssignClick} size="sm" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Assign team member
          </Button>
        </div>
      )}

      {/* Shifts table */}
      <DataTable columns={columns} data={shifts} />

      {/* Notes section if any shift has notes */}
      {shifts.some((s) => s.notes) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Notes</h4>
          {shifts
            .filter((s) => s.notes)
            .map((shift) => (
              <div
                key={shift.id}
                className="text-sm p-3 bg-muted/50 rounded-md border"
              >
                <span className="font-medium">{shift.full_name}:</span>{" "}
                {shift.notes}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
