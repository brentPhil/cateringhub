"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { TeamMembersTable } from "./components/team-members-table";
import { InviteMemberModal } from "./components/invite-member-modal";
import {
  useTeamMembers,
  useInviteMember,
  useUpdateMemberStatus,
  useRemoveMember,
} from "./hooks/use-team-members";
import { useCurrentMembership } from "@/hooks/use-membership";

export default function TeamPage() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Get current user's provider membership using the new hook
  const { data: currentMembership, isLoading: membershipLoading } =
    useCurrentMembership();

  const providerId = currentMembership?.providerId;
  const currentUserId = currentMembership?.userId;

  // Fetch team members
  const { data: members = [], isLoading } = useTeamMembers(providerId);

  // Mutations
  const inviteMutation = useInviteMember(providerId || "");
  const updateStatusMutation = useUpdateMemberStatus(providerId || "");
  const removeMemberMutation = useRemoveMember(providerId || "");

  const handleInvite = async (data: { email: string; role: string }) => {
    if (!providerId) {
      console.error("Cannot invite: No provider ID available");
      return;
    }
    await inviteMutation.mutateAsync(data);
  };

  const handleSuspend = (memberId: string) => {
    updateStatusMutation.mutate({ memberId, status: "suspended" });
  };

  const handleActivate = (memberId: string) => {
    updateStatusMutation.mutate({ memberId, status: "active" });
  };

  const handleRemove = (memberId: string) => {
    if (
      confirm(
        "Are you sure you want to remove this member? This action cannot be undone."
      )
    ) {
      removeMemberMutation.mutate(memberId);
    }
  };

  // Check if user can invite (admin or owner)
  const canInvite = currentMembership?.capabilities.canInviteMembers || false;

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
        <Button
          onClick={() => setInviteModalOpen(true)}
          disabled={!canInvite || !providerId}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite member
        </Button>
      </div>

      {/* Team members table */}
      <TeamMembersTable
        members={members}
        isLoading={isLoading}
        currentUserRole={currentMembership?.role}
        currentUserId={currentUserId}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onRemove={handleRemove}
      />

      {/* Invite member modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvite={handleInvite}
        isLoading={inviteMutation.isPending}
      />
    </div>
  );
}
