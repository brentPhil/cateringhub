"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { ShiftList } from "@/components/shifts/shift-list";
import { AssignTeammateDialog } from "@/components/shifts/assign-teammate-dialog";
import { useShifts } from "../hooks/use-shifts";
import { DataTable } from "@/components/ui/data-table";
import { createBookingsColumns } from "./bookings-columns";
import type { Database } from "@/database.types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

interface BookingsTableProps {
  bookings: Booking[];
  isLoading: boolean;
  canEdit: boolean;
  currentUserId?: string;
  providerId?: string;
  error?: Error | null;
}

// Component to render expanded row content
interface ExpandedRowProps {
  booking: Booking;
  canEdit: boolean;
  providerId?: string;
  onAssignClick: () => void;
}

function ExpandedRowContent({
  booking,
  canEdit,
  providerId,
  onAssignClick,
}: ExpandedRowProps) {
  const {
    data: shifts = [],
    isLoading: shiftsLoading,
    isError: shiftsError,
    error: shiftsErrorData,
  } = useShifts(booking.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Team assignments</h3>
      </div>
      <ShiftList
        bookingId={booking.id}
        shifts={shifts}
        isLoading={shiftsLoading}
        isError={shiftsError}
        error={shiftsErrorData}
        canManage={canEdit}
        onAssignClick={onAssignClick}
      />
    </div>
  );
}

export function BookingsTable({
  bookings,
  isLoading,
  canEdit,
  currentUserId,
  providerId,
  error,
}: BookingsTableProps) {
  const [expandedBookingIds, setExpandedBookingIds] = React.useState<
    Set<string>
  >(new Set());
  const [assignDialogBookingId, setAssignDialogBookingId] = React.useState<
    string | null
  >(null);

  const [localBookings, setLocalBookings] = React.useState<Booking[]>(bookings);

  // Update local bookings when prop changes
  React.useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const handleToggleExpand = (bookingId: string) => {
    setExpandedBookingIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const isExpanded = (bookingId: string) => expandedBookingIds.has(bookingId);

  // Handle row reordering
  const handleRowReorder = (startIndex: number, endIndex: number) => {
    const reordered = [...localBookings];
    const [removed] = reordered.splice(startIndex, 1);
    reordered.splice(endIndex, 0, removed);

    setLocalBookings(reordered);
    // Here you could persist the new order to the database if needed
    // For example: await updateBookingsOrder(reordered.map(b => b.id));
  };

  const columns = React.useMemo(
    () =>
      createBookingsColumns({
        canEdit,
        currentUserId,
        onToggleExpand: handleToggleExpand,
        isExpanded,
      }),
    [canEdit, currentUserId]
  );

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

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-destructive/50 bg-destructive/10">
        <p className="text-lg font-semibold mb-2 text-destructive">
          Error loading bookings
        </p>
        <p className="text-muted-foreground">{error.message}</p>
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
    <>
      <DataTable
        columns={columns}
        data={localBookings}
        searchKey="customer_name"
        searchPlaceholder="Filter by customer name..."
        isRowExpanded={(booking: Booking) => isExpanded(booking.id)}
        renderExpandedRow={(booking: Booking) => (
          <ExpandedRowContent
            booking={booking}
            canEdit={canEdit}
            providerId={providerId}
            onAssignClick={() => setAssignDialogBookingId(booking.id)}
          />
        )}
        enableRowDragging={canEdit}
        onRowReorder={handleRowReorder}
        getRowId={(booking: Booking) => booking.id}
      />

      {/* Assign teammate dialog */}
      {providerId && assignDialogBookingId && (
        <AssignTeammateDialog
          bookingId={assignDialogBookingId}
          providerId={providerId}
          open={!!assignDialogBookingId}
          onOpenChange={(open) => !open && setAssignDialogBookingId(null)}
        />
      )}
    </>
  );
}
