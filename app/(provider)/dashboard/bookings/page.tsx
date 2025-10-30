"use client";

import { useState } from "react";
import { useCurrentMembership } from "@/hooks/use-membership";
import { useBookings } from "./hooks/use-bookings";
import { useTeams } from "../teams/hooks/use-teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { BookingsTable } from "./components/bookings-table";
import { CreateManualBookingDrawer } from "./components/create-manual-booking-drawer";
import { Calendar, Search, UserCheck, Plus } from "lucide-react";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";

export default function BookingsPage() {
  // Get current user's membership
  const { data: membership, isLoading: membershipLoading } =
    useCurrentMembership();
  const providerId = membership?.providerId;

  // Manual booking drawer state
  const [manualBookingDrawerOpen, setManualBookingDrawerOpen] = useState(false);

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    source: parseAsString.withDefault(""),
    team: parseAsString.withDefault(""),
    my_team: parseAsBoolean.withDefault(false),
  });

  // Fetch bookings with role-based filtering
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(
    providerId,
    filters
  );

  // Fetch teams for filter dropdown
  const { data: teams = [] } = useTeams(providerId, { status: "active" });

  const isLoading = membershipLoading || bookingsLoading;
  const bookings = bookingsData?.data || [];
  const canEdit = bookingsData?.canEditBookings || false;

  // Status filter options
  const statusOptions: ComboboxOption[] = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  // Source filter options
  const sourceOptions: ComboboxOption[] = [
    { value: "all", label: "All bookings" },
    { value: "manual", label: "Manual only" },
    { value: "auto", label: "Auto only" },
  ];

  // Team filter options
  const teamOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: "all", label: "All teams" },
      { value: "no-team", label: "No team assigned" },
    ];

    teams.forEach((team) => {
      options.push({ value: team.id, label: team.name });
    });

    return options;
  }, [teams]);

  // Handlers
  const handleSearch = (value: string) => {
    setFilters({ search: value });
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ status: value === "all" ? "" : value });
  };

  const handleSourceFilter = (value: string) => {
    setFilters({ source: value === "all" ? "" : value });
  };

  const handleTeamFilter = (value: string) => {
    setFilters({ team: value === "all" ? "" : value });
  };

  const handleMyTeamToggle = () => {
    setFilters({ my_team: !filters.my_team });
  };

  // Show message if user doesn't have a provider membership
  if (!membership && !membershipLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage your catering bookings and assignments
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No provider membership found
          </h3>
          <p className="text-muted-foreground max-w-md">
            You need to be a member of a provider organization to access
            bookings. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Check if user can create manual bookings (staff or higher)
  const canCreateManualBookings =
    membership?.capabilities.canEditAllBookings || false;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            {membership?.capabilities.canViewAllBookings
              ? "Manage all catering bookings and assignments"
              : membership?.teamId
                ? "View your team's bookings"
                : "View your assigned bookings"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateManualBookings && (
            <Button onClick={() => setManualBookingDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create manual booking
            </Button>
          )}
          {membership?.role && (
            <Badge variant="outline" className="capitalize">
              {membership.role}
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or event type..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Combobox
          options={statusOptions}
          value={filters.status || "all"}
          onValueChange={handleStatusFilter}
          placeholder="Filter by status"
          className="w-full sm:w-[180px]"
        />

        {/* Source filter */}
        <Combobox
          options={sourceOptions}
          value={filters.source || "all"}
          onValueChange={handleSourceFilter}
          placeholder="Filter by source"
          className="w-full sm:w-[180px]"
        />

        {/* Team filter */}
        <Combobox
          options={teamOptions}
          value={filters.team || "all"}
          onValueChange={handleTeamFilter}
          placeholder="Filter by team"
          className="w-full sm:w-[180px]"
        />

        {/* My team filter - only show if user has a team */}
        {membership?.teamId && (
          <Button
            variant={filters.my_team ? "default" : "outline"}
            onClick={handleMyTeamToggle}
            className="w-full sm:w-auto"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            My team&apos;s bookings
          </Button>
        )}
      </div>

      {/* Bookings table */}
      <BookingsTable
        bookings={bookings}
        isLoading={isLoading}
        canEdit={canEdit}
        currentUserId={membership?.userId}
        providerId={providerId}
      />

      {/* Manual booking drawer */}
      {providerId && (
        <CreateManualBookingDrawer
          open={manualBookingDrawerOpen}
          onOpenChange={setManualBookingDrawerOpen}
          providerId={providerId}
        />
      )}
    </div>
  );
}
