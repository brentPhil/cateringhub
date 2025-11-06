"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { ShiftList } from "@/components/shifts/shift-list";
import { AssignBookingTeamDialog } from "./assign-booking-team-dialog";
import { useShifts } from "../hooks/use-shifts";
import { DataTable } from "@/components/ui/data-table";
import { createBookingsColumns } from "./bookings-columns";
import type { Database } from "@/types/supabase";

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
  onAssignClick: () => void;
}

function ExpandedRowContent({
  booking,
  canEdit,
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
      <ShiftList
        bookingId={booking.id}
        shifts={shifts}
        isLoading={shiftsLoading}
        isError={shiftsError}
        error={shiftsErrorData}
        canManage={canEdit}
        onAssignClick={onAssignClick}
        assignCtaLabel="Assign team"
        assignEmptyDescription="Assign a team to this booking to automatically add its members to the shift list."
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
  const router = useRouter();
  const [expandedBookingIds, setExpandedBookingIds] = React.useState<
    Set<string>
  >(new Set());
  const [assignTeamDialog, setAssignTeamDialog] = React.useState<
    | {
        bookingId: string;
        serviceLocationId?: string | null;
        teamId?: string | null;
        eventDate?: string | null;
      }
    | null
  >(null);

  const [localBookings, setLocalBookings] = React.useState<Booking[]>(bookings);

  // Update local bookings when prop changes
  React.useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const handleToggleExpand = React.useCallback((bookingId: string) => {
    setExpandedBookingIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = React.useCallback(
    (bookingId: string) => expandedBookingIds.has(bookingId),
    [expandedBookingIds]
  );

  const handleViewDetails = React.useCallback(
    (bookingId: string) => {
      router.push(`/dashboard/bookings/${bookingId}`);
    },
    [router]
  );

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
        onViewDetails: handleViewDetails,
        onAssignTeam: (booking) =>
          setAssignTeamDialog({
            bookingId: booking.id,
            serviceLocationId: booking.service_location_id ?? null,
            teamId: booking.team_id ?? null,
            eventDate: booking.event_date ?? null,
          }),
      }),
    [canEdit, currentUserId, handleToggleExpand, isExpanded, handleViewDetails]
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
            onAssignClick={() =>
              setAssignTeamDialog({
                bookingId: booking.id,
                serviceLocationId: booking.service_location_id ?? null,
                teamId: booking.team_id ?? null,
                eventDate: booking.event_date ?? null,
              })
            }
          />
        )}
        enableRowDragging={canEdit}
        onRowReorder={handleRowReorder}
        getRowId={(booking: Booking) => booking.id}
      />

      {/* Assign booking team dialog */}
      {providerId && assignTeamDialog && (
        <AssignBookingTeamDialog
          open={!!assignTeamDialog}
          onOpenChange={(open) => !open && setAssignTeamDialog(null)}
          providerId={providerId}
          bookingId={assignTeamDialog.bookingId}
          serviceLocationId={assignTeamDialog.serviceLocationId}
          initialTeamId={assignTeamDialog.teamId}
          eventDate={assignTeamDialog.eventDate}
        />
      )}
    </>
  );
}
