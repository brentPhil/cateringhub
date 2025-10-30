"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import type { Database } from "@/types/supabase";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  team?: {
    id: string;
    name: string;
    status: string;
  } | null;
};
type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface ColumnContext {
  canEdit: boolean;
  currentUserId?: string;
  onToggleExpand: (bookingId: string) => void;
  isExpanded: (bookingId: string) => boolean;
  onViewDetails: (bookingId: string) => void;
}

// Status badge styling
function getStatusBadgeVariant(
  status: BookingStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
      return "default";
    case "in_progress":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

// Format status for display
function formatStatus(status: BookingStatus): string {
  return status.replace("_", " ");
}

export const createBookingsColumns = (
  context: ColumnContext
): ColumnDef<Booking>[] => [
  {
    id: "expander",
    header: () => null,
    cell: ({ row }) => {
      const booking = row.original;
      const isExpanded = context.isExpanded(booking.id);

      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => context.onToggleExpand(booking.id)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle shifts</span>
        </Button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "event_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Event date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <div>
          <div className="font-medium">
            {format(new Date(booking.event_date), "MMM dd, yyyy")}
          </div>
          {booking.event_time && (
            <div className="text-sm text-muted-foreground">
              {booking.event_time}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <div>
          <div>{booking.customer_name}</div>
          {booking.customer_email && (
            <div className="text-sm text-muted-foreground">
              {booking.customer_email}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "event_type",
    header: "Event type",
    cell: ({ row }) => {
      return row.original.event_type || "—";
    },
  },
  {
    accessorKey: "guest_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Guests
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return row.original.guest_count || "—";
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const booking = row.original;
      return (
        <Badge
          variant={getStatusBadgeVariant(booking.status)}
          className="capitalize"
        >
          {formatStatus(booking.status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const booking = row.original;
      return booking.source === "manual" ? (
        <Badge variant="secondary" className="capitalize">
          Manual
        </Badge>
      ) : null;
    },
  },
  {
    id: "team",
    header: "Team",
    cell: ({ row }) => {
      const booking = row.original;
      if (!booking.team) {
        return <span className="text-sm text-muted-foreground">No team</span>;
      }
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{booking.team.name}</span>
          {booking.team.status !== "active" && (
            <Badge variant="outline" className="w-fit mt-1 text-xs">
              {booking.team.status}
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const booking = row.original;
      const isExpanded = context.isExpanded(booking.id);

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => context.onToggleExpand(booking.id)}
              >
                <Users className="mr-2 h-4 w-4" />
                {isExpanded ? "Hide" : "View"} team
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => context.onViewDetails(booking.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              {context.canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit booking
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel booking
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
