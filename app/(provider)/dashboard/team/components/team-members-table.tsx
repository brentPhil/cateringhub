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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getInitials } from "@/lib/utils/avatar";
import { ArrowUpDown, AlertCircle } from "lucide-react";
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
  onEditRole?: (member: TeamMemberWithUser) => void;
  onResendInvitation?: (invitationId: string) => void;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // Sorting props
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  // Error state
  error?: Error | null;
}

export function TeamMembersTable({
  members,
  isLoading,
  currentUserRole,
  currentUserId,
  onSuspend,
  onActivate,
  onRemove,
  onEditRole,
  onResendInvitation,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder = "asc",
  onSort,
  error,
}: TeamMembersTableProps) {
  // Sort members: owners first, then by created_at or sortBy field
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      // Always keep owners at the top
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (a.role !== "owner" && b.role === "owner") return 1;

      // Sort by specified field
      if (sortBy === "last_active") {
        const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
        const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }

      // Default: sort by created_at
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [members, sortBy, sortOrder]);

  if (isLoading) {
    return <TeamMembersTableSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <h3 className="font-semibold text-lg mb-1">
              Failed to load team members
            </h3>
            <p className="text-sm text-muted-foreground">
              {error.message ||
                "An error occurred while fetching team members."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedMembers.length === 0 && !isLoading) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">
              No team members found
            </h3>
            <p className="text-sm text-muted-foreground">
              Get started by inviting your first team member.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort?.("last_active")}
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                >
                  Last active
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => (
              <TableRow key={member.id}>
                {/* Member info with avatar */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.avatar_url}
                        alt={member.full_name}
                      />
                      <AvatarFallback>
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.full_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.email}
                      </span>
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
                    variant={
                      member.status === "suspended" ? "destructive" : "default"
                    }
                    className={
                      member.status !== "suspended"
                        ? getStatusBadgeClassName(member.status)
                        : ""
                    }
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
                    onEditRole={
                      onEditRole ? () => onEditRole(member) : undefined
                    }
                    onResendInvitation={
                      onResendInvitation
                        ? () => onResendInvitation(member.id)
                        : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {onPageChange && onPageSizeChange && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          showPageSizeSelector={true}
          showInfo={true}
        />
      )}
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
