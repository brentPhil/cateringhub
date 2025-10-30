"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { createLocationColumns } from "./location-columns";
import type { ServiceLocation } from "../hooks/use-locations";

interface LocationsTableProps {
  locations: ServiceLocation[];
  canManage: boolean;
  onEdit: (location: ServiceLocation) => void;
  onDelete: (location: ServiceLocation) => void;
  onSetPrimary: (location: ServiceLocation) => void;
}

export function LocationsTable({
  locations,
  canManage,
  onEdit,
  onDelete,
  onSetPrimary,
}: LocationsTableProps) {
  const columns = useMemo(
    () =>
      createLocationColumns({
        canManage,
        onEdit,
        onDelete,
        onSetPrimary,
      }),
    [canManage, onEdit, onDelete, onSetPrimary]
  );

  return (
    <DataTable
      columns={columns}
      data={locations}
      searchKey="city"
      searchPlaceholder="Filter by city..."
    />
  );
}

