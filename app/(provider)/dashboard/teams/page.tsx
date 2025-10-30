"use client";

import { useState, useMemo } from "react";
import { useQueryStates, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertCircle, Users2 } from "lucide-react";
import { useCurrentMembership } from "@/hooks/use-membership";
import { useTeams } from "./hooks/use-teams";
import { TeamsTable } from "./components/teams-table";
import { CreateTeamDialog } from "./components/create-team-dialog";
import { EditTeamDrawer } from "./components/edit-team-drawer";
import { ViewTeamMembersDrawer } from "./components/view-team-members-drawer";
import type { Team } from "./hooks/use-teams";

export default function TeamsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [viewMembersDrawerOpen, setViewMembersDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Get current user's provider membership
  const { data: currentMembership, isLoading: membershipLoading } =
    useCurrentMembership();

  const providerId = currentMembership?.providerId;

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(""),
    location: parseAsString.withDefault(""),
    search: parseAsString.withDefault(""),
  });

  // Fetch teams with filters
  const {
    data: teams = [],
    isLoading,
    error,
  } = useTeams(providerId, {
    status: filters.status || undefined,
    service_location_id: filters.location || undefined,
  });

  // Filter teams by search query (client-side)
  const filteredTeams = useMemo(() => {
    if (!filters.search) return teams;

    const searchLower = filters.search.toLowerCase();
    return teams.filter((team) => {
      const nameMatch = team.name.toLowerCase().includes(searchLower);
      const locationMatch =
        team.service_location?.city?.toLowerCase().includes(searchLower) ||
        team.service_location?.province?.toLowerCase().includes(searchLower) ||
        team.service_location?.barangay?.toLowerCase().includes(searchLower);
      return nameMatch || locationMatch;
    });
  }, [teams, filters.search]);

  // Extract unique locations for filter dropdown
  const locationOptions: ComboboxOption[] = useMemo(() => {
    const uniqueLocations = new Map<
      string,
      { province: string; city: string; barangay: string }
    >();

    teams.forEach((team) => {
      if (team.service_location) {
        const key = team.service_location.id;
        if (!uniqueLocations.has(key)) {
          uniqueLocations.set(key, {
            province: team.service_location.province || "",
            city: team.service_location.city || "",
            barangay: team.service_location.barangay || "",
          });
        }
      }
    });

    const options: ComboboxOption[] = [
      { value: "all", label: "All locations" },
    ];

    uniqueLocations.forEach((location, id) => {
      const parts = [location.city, location.province].filter(Boolean);
      const label = parts.join(", ") || "Unknown location";
      options.push({ value: id, label });
    });

    return options;
  }, [teams]);

  // Status filter options
  const statusOptions: ComboboxOption[] = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "archived", label: "Archived" },
  ];

  // Check if user can manage teams (admin or higher - based on canManageRoles capability)
  const canManageTeams =
    currentMembership?.capabilities.canManageRoles || false;

  // Handlers
  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditDrawerOpen(true);
  };

  const handleViewMembers = (team: Team) => {
    setSelectedTeam(team);
    setViewMembersDrawerOpen(true);
  };

  // Show message if user doesn't have a provider membership
  if (!currentMembership && !membershipLoading && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage operational teams and assignments
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No provider membership found
          </h3>
          <p className="text-muted-foreground max-w-md">
            You need to be a member of a provider organization to access teams
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
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage operational teams and location-based assignments
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={!canManageTeams || !providerId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create team
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Location filter */}
        <Combobox
          options={locationOptions}
          value={filters.location || "all"}
          onValueChange={(value) =>
            setFilters({ location: value === "all" ? "" : value })
          }
          placeholder="Filter by location"
          className="w-[200px]"
        />

        {/* Status filter */}
        <Combobox
          options={statusOptions}
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters({ status: value === "all" ? "" : value })
          }
          placeholder="Filter by status"
          className="w-[200px]"
        />
      </div>

      {/* Teams table */}
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
                Failed to load teams
              </h3>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message ||
                  "An error occurred while fetching teams."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <TeamsTable
          teams={filteredTeams}
          canManage={canManageTeams}
          onEdit={handleEditTeam}
          onViewMembers={handleViewMembers}
        />
      )}

      {/* Create team dialog */}
      {providerId && (
        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          providerId={providerId}
        />
      )}

      {/* Edit team drawer */}
      {providerId && selectedTeam && (
        <EditTeamDrawer
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          providerId={providerId}
          team={selectedTeam}
        />
      )}

      {/* View team members drawer */}
      {providerId && (
        <ViewTeamMembersDrawer
          open={viewMembersDrawerOpen}
          onOpenChange={setViewMembersDrawerOpen}
          teamId={selectedTeam?.id || null}
          teamName={selectedTeam?.name || null}
          providerId={providerId}
        />
      )}
    </div>
  );
}
