"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

interface TeamMembersTableProps {
  members: TeamMemberWithUser[];
  isLoading: boolean;
  currentUserRole?: ProviderRole;
  currentUserId?: string;
  onSuspend: (memberId: string) => void;
  onActivate: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onResendInvitation?: (invitationId: string) => void;
}

export function TeamMembersTable({
  members,
  isLoading,
  currentUserRole,
  currentUserId,
  onSuspend,
  onActivate,
  onRemove,
}: TeamMembersTableProps) {
  // Sort members: owners first, then by created_at
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (a.role !== "owner" && b.role === "owner") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [members]);

  if (isLoading) {
    return <TeamMembersTableSkeleton />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No team members found.
              </TableCell>
            </TableRow>
          ) : (
            sortedMembers.map((member) => (
              <TableRow key={member.id}>
                {/* Member info with avatar */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url} alt={member.full_name} />
                      <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name}</span>
                      <span className="text-sm text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Role badge */}
                <TableCell>
                  <Badge className={getRoleBadgeClassName(member.role)}>
                    {formatRoleDisplay(member.role)}
                  </Badge>
                </TableCell>

                {/* Status badge */}
                <TableCell>
                  <Badge
                    variant={member.status === "suspended" ? "destructive" : "default"}
                    className={member.status !== "suspended" ? getStatusBadgeClassName(member.status) : ""}
                  >
                    {formatStatusDisplay(member.status)}
                  </Badge>
                </TableCell>

                {/* Last active */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatLastActive(member.last_active)}
                </TableCell>

                {/* Actions dropdown */}
                <TableCell>
                  <TeamMemberActions
                    member={member}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                    onSuspend={() => onSuspend(member.id)}
                    onActivate={() => onActivate(member.id)}
                    onRemove={() => onRemove(member.id)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamMembersTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

