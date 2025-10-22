"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, UserCog } from "lucide-react";
import { ShiftActions } from "./shift-actions";
import type { ShiftWithUser } from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";

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

interface ColumnContext {
  bookingId: string;
  canManage: boolean;
}

export const createShiftColumns = (
  context: ColumnContext
): ColumnDef<ShiftWithUser>[] => [
  {
    id: "team_member",
    header: "Team member",
    cell: ({ row }) => {
      const shift = row.original;
      return (
        <div className="flex items-center gap-3">
          {shift.assignee_type === "team_member" ? (
            <>
              <Avatar className="h-8 w-8">
                <AvatarImage src={shift.avatar_url} alt={shift.full_name} />
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
                  <span className="font-medium">{shift.full_name}</span>
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
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const shift = row.original;
      return shift.role ? (
        <span className="capitalize">{shift.role}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "scheduled_time",
    header: "Scheduled time",
    cell: ({ row }) => {
      const shift = row.original;
      return shift.scheduled_start && shift.scheduled_end ? (
        <div className="text-sm">
          <div>{format(new Date(shift.scheduled_start), "MMM dd, h:mm a")}</div>
          <div className="text-muted-foreground">
            to {format(new Date(shift.scheduled_end), "h:mm a")}
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      );
    },
  },
  {
    id: "actual_time",
    header: "Actual time",
    cell: ({ row }) => {
      const shift = row.original;
      return shift.actual_start || shift.actual_end ? (
        <div className="text-sm">
          {shift.actual_start && (
            <div>In: {format(new Date(shift.actual_start), "h:mm a")}</div>
          )}
          {shift.actual_end && (
            <div className="text-muted-foreground">
              Out: {format(new Date(shift.actual_end), "h:mm a")}
            </div>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const shift = row.original;
      return (
        <Badge variant={getStatusBadgeVariant(shift.status)}>
          {getStatusLabel(shift.status)}
        </Badge>
      );
    },
  },
  ...(context.canManage
    ? [
        {
          id: "actions",
          header: () => <div className="text-right">Actions</div>,
          cell: ({ row }: { row: { original: ShiftWithUser } }) => {
            const shift = row.original;
            return (
              <div className="text-right">
                <ShiftActions bookingId={context.bookingId} shift={shift} />
              </div>
            );
          },
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<ShiftWithUser>,
      ]
    : []),
];

