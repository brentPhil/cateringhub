"use client";

import { MoreHorizontal, UserX, UserCheck, Trash2, Mail } from "lucide-react";
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
  onResendInvitation?: () => void;
}

export function TeamMemberActions({
  member,
  currentUserRole,
  currentUserId,
  onSuspend,
  onActivate,
  onRemove,
  onResendInvitation,
}: TeamMemberActionsProps) {
  const isCurrentUser = member.user_id === currentUserId;
  const canManage = currentUserRole && canManageUser(currentUserRole, member.role);
  const isOwner = member.role === "owner";
  const isSuspended = member.status === "suspended";
  const isPending = member.status === "pending";

  // Owners can't manage themselves, and users can only manage lower-ranked members
  const canPerformActions = !isCurrentUser && canManage && !isOwner;

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
        {isPending && onResendInvitation && (
          <>
            <DropdownMenuItem onClick={onResendInvitation}>
              <Mail className="mr-2 h-4 w-4" />
              Resend invitation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {canPerformActions && (
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

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove member
            </DropdownMenuItem>
          </>
        )}

        {!canPerformActions && !isPending && (
          <DropdownMenuItem disabled>
            No actions available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

