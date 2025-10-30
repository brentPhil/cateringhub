"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { createTeamColumns } from "./team-columns";
import type { Team } from "../hooks/use-teams";
import { useArchiveTeam } from "../hooks/use-teams";
import { useCurrentMembership } from "@/hooks/use-membership";

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

  const handleArchive = (team: Team) => {
    if (
      confirm(
        `Are you sure you want to archive "${team.name}"? This will remove the team from active assignments.`
      )
    ) {
      archiveTeamMutation.mutate(team.id);
    }
  };

  const columns = useMemo(
    () =>
      createTeamColumns({
        canManage,
        onEdit,
        onArchive: handleArchive,
        onViewMembers,
      }),
    [canManage, onEdit, onViewMembers]
  );

  return (
    <DataTable
      columns={columns}
      data={teams}
      searchKey="name"
      searchPlaceholder="Filter by team name..."
    />
  );
}
