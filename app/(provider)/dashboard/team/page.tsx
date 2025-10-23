"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { UserPlus, AlertCircle } from "lucide-react";
import { createTeamMembersColumns } from "./components/team-members-columns";
import { InviteMemberModal } from "./components/invite-member-modal";
import { AddStaffModal } from "./components/add-staff-modal";
import { EditRoleDrawer } from "./components/edit-role-drawer";
import { PlanLimitBanner } from "./components/plan-limit-banner";
import {
  useTeamMembers,
  useInviteMember,
  useAddStaff,
  useUpdateMemberStatus,
  useRemoveMember,
  useUpdateMemberRole,
  useResendPasswordLink,
  type TeamMemberWithUser,
} from "./hooks/use-team-members";
import { useCurrentMembership } from "@/hooks/use-membership";
import { toast } from "sonner";

export default function TeamPage() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [editRoleDrawerOpen, setEditRoleDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberWithUser | null>(null);

  // Get current user's provider membership using the new hook
  const { data: currentMembership, isLoading: membershipLoading } =
    useCurrentMembership();

  const providerId = currentMembership?.providerId;
  const currentUserId = currentMembership?.userId;

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    role: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    sortBy: parseAsString.withDefault(""),
    sortOrder: parseAsString.withDefault("asc"),
  });

  // Fetch team members
  const { data: members = [], isLoading, error } = useTeamMembers(providerId);

  // Mutations
  const inviteMutation = useInviteMember(providerId || "");
  const addStaffMutation = useAddStaff(providerId || "");
  const updateStatusMutation = useUpdateMemberStatus(providerId || "");
  const removeMemberMutation = useRemoveMember(providerId || "");
  const updateRoleMutation = useUpdateMemberRole(providerId || "");
  const resendPasswordLinkMutation = useResendPasswordLink(providerId || "");

  // Filter and paginate members
  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    // Filter by role
    if (filters.role) {
      filtered = filtered.filter((member) => member.role === filters.role);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((member) => member.status === filters.status);
    }

    return filtered;
  }, [members, filters.role, filters.status]);

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.pageSize;
    const endIndex = startIndex + filters.pageSize;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, filters.page, filters.pageSize]);

  // Plan limits (mock - replace with actual plan data)
  const TEAM_MEMBER_LIMIT = 5; // Mock limit for demonstration
  const isLimitReached = members.length >= TEAM_MEMBER_LIMIT;

  const handleInvite = async (data: {
    email: string;
    role: string;
    note?: string;
  }) => {
    if (!providerId) {
      console.error("Cannot invite: No provider ID available");
      return;
    }
    await inviteMutation.mutateAsync(data);
  };

  const handleAddStaff = async (data: {
    email: string;
    full_name: string;
    role: string;
  }) => {
    if (!providerId) {
      console.error("Cannot add staff: No provider ID available");
      return;
    }
    await addStaffMutation.mutateAsync(data);
  };

  const handleSuspend = useCallback(
    (memberId: string) => {
      updateStatusMutation.mutate({ memberId, status: "suspended" });
    },
    [updateStatusMutation]
  );

  const handleActivate = useCallback(
    (memberId: string) => {
      updateStatusMutation.mutate({ memberId, status: "active" });
    },
    [updateStatusMutation]
  );

  const handleRemove = useCallback(
    (memberId: string) => {
      if (
        confirm(
          "Are you sure you want to remove this member? This action cannot be undone."
        )
      ) {
        removeMemberMutation.mutate(memberId);
      }
    },
    [removeMemberMutation]
  );

  const handleEditRole = (member: TeamMemberWithUser) => {
    setSelectedMember(member);
    setEditRoleDrawerOpen(true);
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    await updateRoleMutation.mutateAsync({ memberId, role });
  };

  const handleResendInvitation = useCallback(
    (memberId: string) => {
      // Resend password setup link for admin-created pending members
      // Note: Only admin-created members exist as pending in the members table.
      // Email invites don't create a member record until they're accepted (status='active').
      resendPasswordLinkMutation.mutate(memberId);
    },
    [resendPasswordLinkMutation]
  );

  const handleUpgrade = () => {
    // Mock upgrade handler - replace with actual upgrade flow
    toast.info("Upgrade feature coming soon!");
  };

  // Filter options for Combobox
  const roleOptions: ComboboxOption[] = [
    { value: "all", label: "All roles" },
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "staff", label: "Staff" },
    { value: "viewer", label: "Viewer" },
  ];

  const statusOptions: ComboboxOption[] = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
  ];

  // Check if user can invite (admin or owner)
  const canInvite = currentMembership?.capabilities.canInviteMembers || false;

  // Memoize columns with context
  const columns = useMemo(
    () =>
      createTeamMembersColumns({
        currentUserRole: currentMembership?.role,
        currentUserId,
        onSuspend: handleSuspend,
        onActivate: handleActivate,
        onRemove: handleRemove,
        onEditRole: handleEditRole,
        onResendInvitation: handleResendInvitation,
      }),
    [
      currentMembership?.role,
      currentUserId,
      handleSuspend,
      handleActivate,
      handleRemove,
      handleResendInvitation,
    ]
  );

  // Show message if user doesn't have a provider membership
  if (!currentMembership && !membershipLoading && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No provider membership found
          </h3>
          <p className="text-muted-foreground max-w-md">
            You need to be a member of a provider organization to access team
            management. Please contact your administrator or create a provider
            organization first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setInviteModalOpen(true)}
            disabled={!canInvite || !providerId || isLimitReached}
            variant="outline"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite member
          </Button>
          <Button
            onClick={() => setAddStaffModalOpen(true)}
            disabled={!canInvite || !providerId || isLimitReached}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add staff manually
          </Button>
        </div>
      </div>

      {/* Plan limit banner */}
      <PlanLimitBanner
        currentCount={members.length}
        limit={TEAM_MEMBER_LIMIT}
        onUpgrade={handleUpgrade}
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Combobox
            options={roleOptions}
            value={filters.role || "all"}
            onValueChange={(value) =>
              setFilters({ role: value === "all" ? "" : value, page: 1 })
            }
            placeholder="Filter by role"
            className="w-[200px]"
          />
        </div>
        <div>
          <Combobox
            options={statusOptions}
            value={filters.status || "all"}
            onValueChange={(value) =>
              setFilters({ status: value === "all" ? "" : value, page: 1 })
            }
            placeholder="Filter by status"
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Team members table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8">
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Failed to load team members
              </h3>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message ||
                  "An error occurred while fetching team members."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={paginatedMembers}
          searchKey="member"
          searchPlaceholder="Filter by name or email..."
        />
      )}

      {/* Invite member modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvite={handleInvite}
        isLoading={inviteMutation.isPending}
      />

      {/* Add staff manually modal */}
      <AddStaffModal
        open={addStaffModalOpen}
        onOpenChange={setAddStaffModalOpen}
        onAddStaff={handleAddStaff}
        isLoading={addStaffMutation.isPending}
        isLimitReached={isLimitReached}
      />

      {/* Edit role drawer */}
      <EditRoleDrawer
        open={editRoleDrawerOpen}
        onOpenChange={setEditRoleDrawerOpen}
        member={selectedMember}
        onUpdateRole={handleUpdateRole}
        isLoading={updateRoleMutation.isPending}
      />
    </div>
  );
}
