"use client";

import { useState, useMemo } from "react";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { UserPlus, Search } from "lucide-react";
import { WorkerProfilesTable } from "./components/worker-profiles-table";

import {
  useWorkerProfiles,
  useCreateWorkerProfile,
  useUpdateWorkerProfile,
  useDeleteWorkerProfile,
  useWorkerRoles,
  type WorkerProfile,
} from "./hooks/use-worker-profiles";
import { useCurrentMembership } from "@/hooks/use-membership";
import { toast } from "sonner";
import { AddWorkerModal } from "./components/add-worker-modal";
import { EditWorkerDrawer } from "./components/edit-worker-drawer";

export default function WorkersPage() {
  const [addWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
  const [editWorkerDrawerOpen, setEditWorkerDrawerOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(
    null
  );

  // Get current user's provider membership
  const { data: currentMembership, isLoading: membershipLoading } =
    useCurrentMembership();

  const providerId = currentMembership?.providerId;

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    role: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    search: parseAsString.withDefault(""),
  });

  // Fetch worker profiles with filters
  const {
    data: workers = [],
    isLoading,
    error,
  } = useWorkerProfiles(providerId, {
    status: filters.status as "active" | "inactive" | undefined,
    role: filters.role || undefined,
    search: filters.search || undefined,
  });

  // Fetch available roles for filter dropdown
  const { data: availableRoles = [] } = useWorkerRoles(providerId);

  // Mutations
  const createWorkerMutation = useCreateWorkerProfile(providerId || "");
  const updateWorkerMutation = useUpdateWorkerProfile();
  const deleteWorkerMutation = useDeleteWorkerProfile();

  // Filtering is done server-side via the hook
  const filteredWorkers = useMemo(() => {
    return workers;
  }, [workers]);

  // Prepare combobox options
  const roleOptions: ComboboxOption[] = useMemo(
    () => [
      { value: "all", label: "All roles" },
      ...availableRoles.map((role) => ({ value: role, label: role })),
    ],
    [availableRoles]
  );

  const statusOptions: ComboboxOption[] = [
    { value: "all", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  // Handlers
  const handleAddWorker = async (data: {
    name: string;
    phone?: string;
    role?: string;
    tags?: string[];
    certifications?: string[];
    hourlyRate?: number;
    notes?: string;
    status?: "active" | "inactive";
  }) => {
    await createWorkerMutation.mutateAsync(data);
  };

  const handleEditWorker = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    setEditWorkerDrawerOpen(true);
  };

  const handleUpdateWorker = async (data: {
    name?: string;
    phone?: string;
    role?: string;
    tags?: string[];
    certifications?: string[];
    hourlyRate?: number;
    notes?: string;
    status?: "active" | "inactive";
  }) => {
    if (!selectedWorker) return;

    await updateWorkerMutation.mutateAsync({
      workerId: selectedWorker.id,
      ...data,
    });
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this worker profile? This action cannot be undone."
      )
    ) {
      return;
    }

    await deleteWorkerMutation.mutateAsync(workerId);
  };

  // Check permissions
  const canManageWorkers =
    currentMembership?.capabilities?.canInviteMembers || false;

  if (membershipLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!providerId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">
          You must be a member of a provider to view workers
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker profiles</h1>
          <p className="text-muted-foreground">
            Manage non-login staff who can be assigned to shifts
          </p>
        </div>
        <Button
          onClick={() => setAddWorkerModalOpen(true)}
          disabled={!canManageWorkers || !providerId}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add worker
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Worker profiles are for staff who don&apos;t need login access. They
          can be assigned to shifts and tracked for attendance and payroll, but
          won&apos;t count toward your team member seat limit.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Role filter */}
        <Combobox
          options={roleOptions}
          value={filters.role || "all"}
          onValueChange={(value) =>
            setFilters({ role: value === "all" ? "" : value })
          }
          placeholder="Filter by role"
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

      {/* Worker profiles table */}
      <WorkerProfilesTable
        workers={filteredWorkers}
        isLoading={isLoading}
        canManage={canManageWorkers}
        onEdit={handleEditWorker}
        onDelete={handleDeleteWorker}
        error={error as Error | null}
      />

      {/* Add worker modal */}
      <AddWorkerModal
        open={addWorkerModalOpen}
        onOpenChange={setAddWorkerModalOpen}
        onAdd={handleAddWorker}
        isLoading={createWorkerMutation.isPending}
      />

      {/* Edit worker drawer */}
      {selectedWorker && (
        <EditWorkerDrawer
          open={editWorkerDrawerOpen}
          onOpenChange={setEditWorkerDrawerOpen}
          worker={selectedWorker}
          onUpdate={handleUpdateWorker}
          isLoading={updateWorkerMutation.isPending}
        />
      )}
    </div>
  );
}
