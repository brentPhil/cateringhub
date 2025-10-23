"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  XCircle,
  Edit,
  UserPlus,
  CreditCard,
  MoreHorizontal,
  Send,
  Calendar,
  Trash2,
} from "lucide-react";
import type {
  BookingDetailData,
  BookingDetailCapabilities,
} from "../../hooks/use-booking-detail";

interface WorkflowActionsBarProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
  onConfirm?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onAssignTeam?: () => void;
  onManageBilling?: () => void;
  onSendUpdate?: () => void;
  onReschedule?: () => void;
  onDelete?: () => void;
}

export function WorkflowActionsBar({
  booking,
  capabilities,
  onConfirm,
  onCancel,
  onComplete,
  onEdit,
  onAssignTeam,
  onManageBilling,
  onSendUpdate,
  onReschedule,
  onDelete,
}: WorkflowActionsBarProps) {
  const status = booking.status;
  const canEdit = capabilities.canEdit;
  const canAssign = capabilities.canAssign;
  const canManageBilling = capabilities.canManageBilling;

  // Determine primary actions based on booking status
  const getPrimaryActions = () => {
    switch (status) {
      case "pending":
        return (
          <>
            {canEdit && (
              <Button onClick={onConfirm} className="gap-2 w-full sm:w-auto">
                <CheckCircle className="h-4 w-4" />
                Confirm booking
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <Edit className="h-4 w-4" />
                Edit details
              </Button>
            )}
          </>
        );

      case "confirmed":
        return (
          <>
            {canAssign && (
              <Button onClick={onAssignTeam} className="gap-2 w-full sm:w-auto">
                <UserPlus className="h-4 w-4" />
                Assign team
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={onComplete}
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                Mark complete
              </Button>
            )}
          </>
        );

      case "in_progress":
        return (
          <>
            {canEdit && (
              <Button onClick={onComplete} className="gap-2 w-full sm:w-auto">
                <CheckCircle className="h-4 w-4" />
                Mark complete
              </Button>
            )}
            {canManageBilling && (
              <Button
                onClick={onManageBilling}
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            )}
          </>
        );

      case "completed":
        return (
          <>
            {canManageBilling && (
              <Button
                onClick={onManageBilling}
                className="gap-2 w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              disabled
            >
              <CheckCircle className="h-4 w-4" />
              Completed
            </Button>
          </>
        );

      case "cancelled":
        return (
          <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled>
            <XCircle className="h-4 w-4" />
            Cancelled
          </Button>
        );

      default:
        return null;
    }
  };

  // Secondary actions in dropdown menu
  const getSecondaryActions = () => {
    const actions = [];

    // Edit action (if not primary)
    if (canEdit && status !== "pending" && status !== "cancelled") {
      actions.push(
        <DropdownMenuItem key="edit" onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit details
        </DropdownMenuItem>
      );
    }

    // Assign team (if not primary)
    if (canAssign && status !== "confirmed" && status !== "cancelled") {
      actions.push(
        <DropdownMenuItem key="assign" onClick={onAssignTeam}>
          <UserPlus className="mr-2 h-4 w-4" />
          Assign team
        </DropdownMenuItem>
      );
    }

    // Billing (if not primary)
    if (
      canManageBilling &&
      status !== "in_progress" &&
      status !== "completed" &&
      status !== "cancelled"
    ) {
      actions.push(
        <DropdownMenuItem key="billing" onClick={onManageBilling}>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage billing
        </DropdownMenuItem>
      );
    }

    // Send update
    if (status !== "cancelled") {
      actions.push(
        <DropdownMenuItem key="send-update" onClick={onSendUpdate}>
          <Send className="mr-2 h-4 w-4" />
          Send update to customer
        </DropdownMenuItem>
      );
    }

    // Separator before destructive actions
    if (actions.length > 0 && canEdit && status !== "cancelled") {
      actions.push(<DropdownMenuSeparator key="separator-1" />);
    }

    // Reschedule
    if (canEdit && status !== "completed" && status !== "cancelled") {
      actions.push(
        <DropdownMenuItem key="reschedule" onClick={onReschedule}>
          <Calendar className="mr-2 h-4 w-4" />
          Reschedule event
        </DropdownMenuItem>
      );
    }

    // Cancel booking
    if (canEdit && status !== "completed" && status !== "cancelled") {
      actions.push(
        <DropdownMenuItem
          key="cancel"
          onClick={onCancel}
          className="text-destructive focus:text-destructive"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel booking
        </DropdownMenuItem>
      );
    }

    // Delete booking (only for cancelled bookings)
    if (canEdit && status === "cancelled") {
      if (actions.length > 0) {
        actions.push(<DropdownMenuSeparator key="separator-2" />);
      }
      actions.push(
        <DropdownMenuItem
          key="delete"
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete booking
        </DropdownMenuItem>
      );
    }

    return actions;
  };

  const secondaryActions = getSecondaryActions();
  const hasSecondaryActions = secondaryActions.length > 0;

  return (
    <Card className="sticky bottom-4 border bg-card shadow-md">
      <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side - Status info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <div className="text-sm text-muted-foreground">Quick actions</div>
            <div className="text-xs text-muted-foreground">
              {booking.customer_name} • {booking.event_type || "Event"}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {getPrimaryActions()}

          {/* More actions dropdown */}
          {hasSecondaryActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>More actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {secondaryActions}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
