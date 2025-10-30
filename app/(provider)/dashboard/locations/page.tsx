"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertCircle, MapPin } from "lucide-react";
import { useCurrentMembership } from "@/hooks/use-membership";
import { useLocations, useDeleteLocation, useSetPrimaryLocation, type ServiceLocation } from "./hooks/use-locations";
import { LocationsTable } from "./components/locations-table";
import { CreateLocationDialog } from "./components/create-location-dialog";
import { EditLocationDrawer } from "./components/edit-location-drawer";

export default function LocationsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);

  // Get current user's provider membership
  const { data: currentMembership, isLoading: membershipLoading } =
    useCurrentMembership();

  const providerId = currentMembership?.providerId;

  // Fetch locations
  const {
    data: locations = [],
    isLoading,
    error,
  } = useLocations(providerId);

  // Mutations
  const deleteLocationMutation = useDeleteLocation(providerId || "");
  const setPrimaryLocationMutation = useSetPrimaryLocation(providerId || "");

  // Permission check
  const canManageLocations = currentMembership?.capabilities.canManageTeam || false;

  // Handlers
  const handleEditLocation = (location: ServiceLocation) => {
    setSelectedLocation(location);
    setEditDrawerOpen(true);
  };

  const handleDeleteLocation = (location: ServiceLocation) => {
    if (
      confirm(
        `Are you sure you want to delete "${location.city}, ${location.province}"? This action cannot be undone.`
      )
    ) {
      deleteLocationMutation.mutate(location.id);
    }
  };

  const handleSetPrimary = (location: ServiceLocation) => {
    setPrimaryLocationMutation.mutate(location.id);
  };

  // Loading state
  if (membershipLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your service locations and coverage areas
          </p>
        </div>
        {canManageLocations && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        )}
      </div>

      {/* Locations table */}
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
                Failed to load locations
              </h3>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message ||
                  "An error occurred while fetching service locations."}
              </p>
            </div>
          </div>
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-md border border-dashed p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                No service locations
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Add your first service location to start managing your coverage areas and teams.
              </p>
            </div>
            {canManageLocations && (
              <Button onClick={() => setCreateDialogOpen(true)} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add location
              </Button>
            )}
          </div>
        </div>
      ) : (
        <LocationsTable
          locations={locations}
          canManage={canManageLocations}
          onEdit={handleEditLocation}
          onDelete={handleDeleteLocation}
          onSetPrimary={handleSetPrimary}
        />
      )}

      {/* Create location dialog */}
      {providerId && (
        <CreateLocationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          providerId={providerId}
        />
      )}

      {/* Edit location drawer */}
      {providerId && selectedLocation && (
        <EditLocationDrawer
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          providerId={providerId}
          location={selectedLocation}
        />
      )}
    </div>
  );
}

