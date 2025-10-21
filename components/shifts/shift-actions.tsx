"use client";

import { useState } from "react";
import { LogIn, LogOut, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCheckIn,
  useCheckOut,
  useDeleteShift,
} from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";
import type { ShiftWithUser } from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";

interface ShiftActionsProps {
  bookingId: string;
  shift: ShiftWithUser;
}

export function ShiftActions({ bookingId, shift }: ShiftActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const checkInMutation = useCheckIn(bookingId);
  const checkOutMutation = useCheckOut(bookingId);
  const deleteShiftMutation = useDeleteShift(bookingId);

  const isScheduled = shift.status === "scheduled";
  const isCheckedIn = shift.status === "checked_in";
  const isCheckedOut = shift.status === "checked_out";
  const isCancelled = shift.status === "cancelled";

  const canCheckIn = isScheduled && !shift.actual_start;
  const canCheckOut = isCheckedIn && shift.actual_start && !shift.actual_end;
  const canDelete = isScheduled && !shift.actual_start;

  const handleCheckIn = () => {
    checkInMutation.mutate(shift.id);
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate(shift.id);
  };

  const handleDelete = () => {
    deleteShiftMutation.mutate(shift.id);
    setShowDeleteDialog(false);
  };

  const isLoading =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    deleteShiftMutation.isPending;

  // If cancelled, show no actions
  if (isCancelled) {
    return (
      <Button variant="ghost" size="sm" disabled>
        No actions
      </Button>
    );
  }

  // If checked out, show no actions
  if (isCheckedOut) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Completed
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Check in */}
          {canCheckIn && (
            <DropdownMenuItem
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check in
            </DropdownMenuItem>
          )}

          {/* Check out */}
          {canCheckOut && (
            <DropdownMenuItem
              onClick={handleCheckOut}
              disabled={checkOutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Check out
            </DropdownMenuItem>
          )}

          {/* Delete */}
          {canDelete && (
            <>
              {canCheckIn && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteShiftMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </>
          )}

          {!canCheckIn && !canCheckOut && !canDelete && (
            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{shift.full_name}</strong> from
              this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

