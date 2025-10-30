"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Star, Pencil, Trash2 } from "lucide-react";
import type { ServiceLocation } from "../hooks/use-locations";

interface CreateLocationColumnsProps {
  canManage: boolean;
  onEdit: (location: ServiceLocation) => void;
  onDelete: (location: ServiceLocation) => void;
  onSetPrimary: (location: ServiceLocation) => void;
}

export function createLocationColumns({
  canManage,
  onEdit,
  onDelete,
  onSetPrimary,
}: CreateLocationColumnsProps): ColumnDef<ServiceLocation>[] {
  return [
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.original;
        const parts = [
          location.barangay,
          location.city,
          location.province,
        ].filter(Boolean);

        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{parts.join(", ")}</span>
              {location.is_primary && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Primary
                </Badge>
              )}
            </div>
            {location.street_address && (
              <span className="text-sm text-muted-foreground">
                {location.street_address}
              </span>
            )}
            {location.landmark && (
              <span className="text-xs text-muted-foreground">
                Near {location.landmark}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "service_radius",
      header: "Service radius",
      cell: ({ row }) => {
        const location = row.original;
        if (!location.service_radius) {
          return <span className="text-sm text-muted-foreground">Not set</span>;
        }
        return (
          <span className="text-sm">{location.service_radius} km</span>
        );
      },
    },
    {
      id: "capacity",
      header: "Capacity",
      cell: ({ row }) => {
        const location = row.original;
        const hasCapacity = location.daily_capacity || location.max_concurrent_events;

        if (!hasCapacity) {
          return <span className="text-sm text-muted-foreground">Not set</span>;
        }

        return (
          <div className="flex flex-col text-sm">
            {location.daily_capacity && (
              <span>{location.daily_capacity} events/day</span>
            )}
            {location.max_concurrent_events && (
              <span className="text-xs text-muted-foreground">
                Max {location.max_concurrent_events} concurrent
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const location = row.original;
        if (!location.service_area_notes) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm line-clamp-2">
            {location.service_area_notes}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const location = row.original;

        if (!canManage) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!location.is_primary && (
                <DropdownMenuItem onClick={() => onSetPrimary(location)}>
                  <Star className="mr-2 h-4 w-4" />
                  Set as primary
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(location)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit location
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(location)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

