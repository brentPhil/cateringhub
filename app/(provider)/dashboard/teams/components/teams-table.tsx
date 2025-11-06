"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { createTeamColumns } from "./team-columns";
import type { Team } from "../hooks/use-teams";
import { useArchiveTeam, useDeleteTeam } from "../hooks/use-teams";
import { useCurrentMembership } from "@/hooks/use-membership";
import { TeamMembersInline } from "./team-members-inline";

interface TeamsTableProps {
  teams: Team[];
  canManage: boolean;
  onEdit: (team: Team) => void;
  onViewMembers?: (team: Team) => void;
}

export function TeamsTable({
  teams,
  canManage,
  onEdit,
  onViewMembers,
}: TeamsTableProps) {
  const { data: currentMembership } = useCurrentMembership();
  const providerId = currentMembership?.providerId;

  const archiveTeamMutation = useArchiveTeam(providerId || "");
  const deleteTeamMutation = useDeleteTeam(providerId || "");

  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());

  const toggleExpand = (teamId: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const isExpanded = (teamId: string) => expandedTeamIds.has(teamId);

  const handleArchive = (team: Team) => {
    if (
      confirm(
        `Are you sure you want to archive "${team.name}"? This will remove the team from active assignments.`
      )
    ) {
      archiveTeamMutation.mutate(team.id);
    }
  };

  const handleDelete = (team: Team) => {
    if (
      confirm(
        `Permanently delete "${team.name}"? This will unassign it from bookings and members. This cannot be undone.`
      )
    ) {
      deleteTeamMutation.mutate(team.id);
    }
  };

  const columns = useMemo(
    () =>
      createTeamColumns({
        canManage,
        onEdit,
        onArchive: handleArchive,
        onDelete: handleDelete,
        onViewMembers,
        onToggleExpand: toggleExpand,
        isExpanded,
      }),
    [canManage, onEdit, onViewMembers, expandedTeamIds]
  );

  return (
    <DataTable
      columns={columns}
      data={teams}
      searchKey="name"
      searchPlaceholder="Filter by team name..."
      isRowExpanded={(team: Team) => isExpanded(team.id)}
      renderExpandedRow={(team: Team) => {
        if (!providerId) return null;
        const rowCanManage =
          canManage ||
          (currentMembership?.role === "supervisor" &&
            currentMembership?.teamId === team.id);
        return (
          <TeamMembersInline
            providerId={providerId}
            teamId={team.id}
            teamName={team.name}
            canManage={rowCanManage}
          />
        );
      }}
    />
  );
}
