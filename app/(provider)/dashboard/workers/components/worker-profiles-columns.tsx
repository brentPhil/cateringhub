"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Phone, DollarSign } from "lucide-react";
import { WorkerProfileActions } from "./worker-profile-actions";
import type { WorkerProfile } from "../hooks/use-worker-profiles";

interface ColumnContext {
  canManage: boolean;
  onEdit: (worker: WorkerProfile) => void;
  onDelete: (workerId: string) => void;
}

export const createWorkerProfileColumns = (
  context: ColumnContext
): ColumnDef<WorkerProfile>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const worker = row.original;
      return (
        <div>
          <div className="font-medium">{worker.name}</div>
          {worker.certifications && worker.certifications.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {worker.certifications.join(", ")}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const role = row.getValue("role") as string | null;
      return role ? (
        <span className="capitalize">{role}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Contact",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null;
      return phone ? (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          {phone}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "hourly_rate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Hourly rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const hourlyRate = row.getValue("hourly_rate") as number | null;
      return hourlyRate ? (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          {Number(hourlyRate).toFixed(2)}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("hourly_rate") as number | null;
      const b = rowB.getValue("hourly_rate") as number | null;
      return (a || 0) - (b || 0);
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.getValue("tags") as string[] | null;
      return tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as "active" | "inactive";
      return (
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  ...(context.canManage
    ? [
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: { row: { original: WorkerProfile } }) => {
            const worker = row.original;
            return (
              <WorkerProfileActions
                worker={worker}
                onEdit={() => context.onEdit(worker)}
                onDelete={() => context.onDelete(worker.id)}
              />
            );
          },
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<WorkerProfile>,
      ]
    : []),
];
