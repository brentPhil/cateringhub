"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { getInitials } from "@/lib/utils/avatar";
import {
  formatRoleDisplay,
  formatStatusDisplay,
  formatLastActive,
  getRoleBadgeClassName,
  getStatusBadgeClassName,
} from "../lib/team-utils";
import { TeamMemberActions } from "./team-member-actions";
import type { TeamMemberWithUser } from "../hooks/use-team-members";
import type { ProviderRole } from "../lib/team-utils";

interface ColumnContext {
  currentUserRole?: ProviderRole;
  currentUserId?: string;
  onSuspend: (memberId: string) => void;
  onActivate: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onEditRole?: (member: TeamMemberWithUser) => void;
  onResendInvitation?: (invitationId: string) => void;
}

export const createTeamMembersColumns = (
  context: ColumnContext
): ColumnDef<TeamMemberWithUser>[] => [
  {
    id: "member",
    accessorKey: "full_name",
    header: "Member",
    cell: ({ row }) => {
      const member = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar_url} alt={member.full_name} />
            <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{member.full_name}</span>
            <span className="text-sm text-muted-foreground">
              {member.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const member = row.original;
      return (
        <Badge className={getRoleBadgeClassName(member.role)}>
          {formatRoleDisplay(member.role)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const member = row.original;
      return (
        <Badge
          variant={member.status === "suspended" ? "destructive" : "default"}
          className={
            member.status !== "suspended"
              ? getStatusBadgeClassName(member.status)
              : ""
          }
        >
          {formatStatusDisplay(member.status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "last_active",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 data-[state=open]:bg-accent"
        >
          Last active
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const member = row.original;
      return (
        <span className="text-sm text-muted-foreground">
          {formatLastActive(member.last_active)}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="w-[80px]">Actions</div>,
    cell: ({ row }) => {
      const member = row.original;
      return (
        <TeamMemberActions
          member={member}
          currentUserRole={context.currentUserRole}
          currentUserId={context.currentUserId}
          onSuspend={() => context.onSuspend(member.id)}
          onActivate={() => context.onActivate(member.id)}
          onRemove={() => context.onRemove(member.id)}
          onEditRole={
            context.onEditRole ? () => context.onEditRole!(member) : undefined
          }
          onResendInvitation={
            context.onResendInvitation
              ? () => context.onResendInvitation!(member.id)
              : undefined
          }
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

