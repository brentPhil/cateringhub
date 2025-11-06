"use client";

import {
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  Edit,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { canManageUser } from "../lib/team-utils";
import type { TeamMemberWithUser } from "../hooks/use-team-members";
import type { ProviderRole } from "../lib/team-utils";

interface TeamMemberActionsProps {
  member: TeamMemberWithUser;
  currentUserRole?: ProviderRole;
  currentUserId?: string;
  onSuspend: () => void;
  onActivate: () => void;
  onRemove: () => void;
  onEditRole?: () => void;
  onResendInvitation?: () => void;
  onAssignTeam?: () => void;
}

export function TeamMemberActions({
  member,
  currentUserRole,
  currentUserId,
  onSuspend,
  onActivate,
  onRemove,
  onEditRole,
  onResendInvitation,
  onAssignTeam,
}: TeamMemberActionsProps) {
  const isCurrentUser = member.user_id === currentUserId;
  const canManage =
    currentUserRole && canManageUser(currentUserRole, member.role);
  const isOwner = member.role === "owner";
  const isSuspended = member.status === "suspended";
  const isPending = member.status === "pending";
  const isAdminCreated = member.invitation_method === "admin_created";

  // Owners can't manage themselves, and users can only manage lower-ranked members
  const canPerformActions = !isCurrentUser && canManage && !isOwner;

  // Only show resend for admin-created pending members
  // Email invites don't exist as pending members (they're created as active when accepted)
  const canResend = isPending && isAdminCreated && onResendInvitation;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={!canPerformActions && !isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canResend && (
          <>
            <DropdownMenuItem onClick={onResendInvitation}>
              <Mail className="mr-2 h-4 w-4" />
              Resend password setup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {canPerformActions && (
          <>
            {/* Edit role */}
            {onEditRole && !isPending && (
              <DropdownMenuItem onClick={onEditRole}>
                <Edit className="mr-2 h-4 w-4" />
                Edit role
              </DropdownMenuItem>
            )}

            {/* Assign to team */}
            {onAssignTeam && !isPending && (
              <DropdownMenuItem onClick={onAssignTeam}>
                <Users2 className="mr-2 h-4 w-4" />
                Assign to team
              </DropdownMenuItem>
            )}

            {/* Suspend/Activate */}
            {!isPending && (
              <>
                {isSuspended ? (
                  <DropdownMenuItem onClick={onActivate}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activate member
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onSuspend}>
                    <UserX className="mr-2 h-4 w-4" />
                    Suspend member
                  </DropdownMenuItem>
                )}
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete permanently
            </DropdownMenuItem>
          </>
        )}

        {!canPerformActions && !isPending && (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
