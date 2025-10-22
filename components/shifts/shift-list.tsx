"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Clock, AlertCircle, Phone, UserCog } from "lucide-react";
import { ShiftActions } from "./shift-actions";
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

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "checked_out":
      return "default"; // Green/success
    case "checked_in":
      return "secondary"; // Blue
    case "scheduled":
      return "outline"; // Gray
    case "cancelled":
      return "destructive"; // Red
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "checked_out":
      return "Checked out";
    case "checked_in":
      return "Checked in";
    case "scheduled":
      return "Scheduled";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Scheduled time</TableHead>
              <TableHead>Actual time</TableHead>
              <TableHead>Status</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                {/* Team member or Worker */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    {shift.assignee_type === "team_member" ? (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={shift.avatar_url}
                            alt={shift.full_name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(shift.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{shift.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {shift.email}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {shift.full_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Worker
                            </Badge>
                          </div>
                          {shift.worker_profile?.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {shift.worker_profile.phone}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell>
                  {shift.role ? (
                    <span className="capitalize">{shift.role}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Scheduled time */}
                <TableCell>
                  {shift.scheduled_start && shift.scheduled_end ? (
                    <div className="text-sm">
                      <div>
                        {format(
                          new Date(shift.scheduled_start),
                          "MMM dd, h:mm a"
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        to {format(new Date(shift.scheduled_end), "h:mm a")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </TableCell>

                {/* Actual time */}
                <TableCell>
                  {shift.actual_start || shift.actual_end ? (
                    <div className="text-sm">
                      {shift.actual_start && (
                        <div>
                          In: {format(new Date(shift.actual_start), "h:mm a")}
                        </div>
                      )}
                      {shift.actual_end && (
                        <div className="text-muted-foreground">
                          Out: {format(new Date(shift.actual_end), "h:mm a")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(shift.status)}>
                    {getStatusLabel(shift.status)}
                  </Badge>
                </TableCell>

                {/* Actions */}
                {canManage && (
                  <TableCell className="text-right">
                    <ShiftActions bookingId={bookingId} shift={shift} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
