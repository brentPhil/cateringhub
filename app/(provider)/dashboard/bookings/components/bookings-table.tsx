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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import type { Database } from "@/types/supabase";
import type { BookingsPagination } from "../hooks/use-bookings";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingsTableProps {
  bookings: Booking[];
  isLoading: boolean;
  canEdit: boolean;
  currentUserId?: string;
  pagination?: BookingsPagination;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
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

export function BookingsTable({
  bookings,
  isLoading,
  canEdit,
  currentUserId,
  pagination,
  onSort,
  onPageChange,
  onPageSizeChange,
}: BookingsTableProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <p className="text-lg font-semibold mb-2">No bookings found</p>
        <p className="text-muted-foreground">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("event_date")}
                  className="-ml-3"
                >
                  Event date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("customer_name")}
                  className="-ml-3"
                >
                  Customer
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Event type</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("guest_count")}
                  className="-ml-3"
                >
                  Guests
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("status")}
                  className="-ml-3"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {format(new Date(booking.event_date), "MMM dd, yyyy")}
                  {booking.event_time && (
                    <div className="text-sm text-muted-foreground">
                      {booking.event_time}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>{booking.customer_name}</div>
                  {booking.customer_email && (
                    <div className="text-sm text-muted-foreground">
                      {booking.customer_email}
                    </div>
                  )}
                </TableCell>
                <TableCell>{booking.event_type || "—"}</TableCell>
                <TableCell>{booking.guest_count || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusBadgeVariant(booking.status)}
                    className="capitalize"
                  >
                    {formatStatus(booking.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {booking.assigned_to ? (
                    <Badge
                      variant={
                        booking.assigned_to === currentUserId
                          ? "default"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {booking.assigned_to === currentUserId
                        ? "You"
                        : "Assigned"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      {canEdit && (
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <select
              aria-label="Select number of rows per page"
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
