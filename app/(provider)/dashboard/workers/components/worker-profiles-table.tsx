"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { createWorkerProfileColumns } from "./worker-profiles-columns";
import type { WorkerProfile } from "../hooks/use-worker-profiles";

interface WorkerProfilesTableProps {
  workers: WorkerProfile[];
  isLoading: boolean;
  canManage: boolean;
  onEdit: (worker: WorkerProfile) => void;
  onDelete: (workerId: string) => void;
  onAssignTeam?: (worker: WorkerProfile) => void;
  error?: Error | null;
}

export function WorkerProfilesTable({
  workers,
  isLoading,
  canManage,
  onEdit,
  onDelete,
  onAssignTeam,
  error,
}: WorkerProfilesTableProps) {
  const columns = React.useMemo(
    () =>
      createWorkerProfileColumns({ canManage, onEdit, onDelete, onAssignTeam }),
    [canManage, onEdit, onDelete, onAssignTeam]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold">Failed to load worker profiles</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h3 className="font-semibold">No worker profiles found</h3>
          <p className="text-sm text-muted-foreground">
            Get started by adding your first worker profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={workers}
      searchKey="name"
      searchPlaceholder="Filter by name..."
    />
  );
}
