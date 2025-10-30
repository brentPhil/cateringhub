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
import { MoreHorizontal, Pencil, Archive, Users } from "lucide-react";
import type { Team } from "../hooks/use-teams";
import type { Enums } from "@/types/supabase";

interface CreateTeamColumnsOptions {
  canManage: boolean;
  onEdit: (team: Team) => void;
  onArchive?: (team: Team) => void;
  onViewMembers?: (team: Team) => void;
}

export function createTeamColumns({
  canManage,
  onEdit,
  onArchive,
  onViewMembers,
}: CreateTeamColumnsOptions): ColumnDef<Team>[] {
  return [
    {
      accessorKey: "name",
      header: "Team name",
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{team.name}</span>
            {team.description && (
              <span className="text-sm text-muted-foreground line-clamp-1">
                {team.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "service_location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.original.service_location;
        if (!location) {
          return <span className="text-muted-foreground">No location</span>;
        }

        const parts = [
          location.barangay,
          location.city,
          location.province,
        ].filter(Boolean);

        return (
          <div className="flex flex-col">
            <span className="text-sm">{parts.join(", ")}</span>
            {location.is_primary && (
              <Badge variant="outline" className="w-fit mt-1">
                Primary
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status as Enums<"team_status">;
        
        const statusConfig = {
          active: { label: "Active", variant: "default" as const },
          inactive: { label: "Inactive", variant: "secondary" as const },
          archived: { label: "Archived", variant: "outline" as const },
        };

        const config = statusConfig[status] || statusConfig.inactive;

        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: "daily_capacity",
      header: "Capacity",
      cell: ({ row }) => {
        const team = row.original;
        const dailyCapacity = team.daily_capacity;
        const maxConcurrent = team.max_concurrent_events;

        if (!dailyCapacity && !maxConcurrent) {
          return <span className="text-muted-foreground">Not set</span>;
        }

        return (
          <div className="flex flex-col text-sm">
            {dailyCapacity && (
              <span>{dailyCapacity} events/day</span>
            )}
            {maxConcurrent && (
              <span className="text-muted-foreground">
                {maxConcurrent} concurrent
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "member_count",
      header: "Members",
      cell: ({ row }) => {
        const count = row.original.member_count || 0;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original;

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
              
              {onViewMembers && (
                <DropdownMenuItem onClick={() => onViewMembers(team)}>
                  <Users className="mr-2 h-4 w-4" />
                  View members
                </DropdownMenuItem>
              )}

              {canManage && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(team)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit team
                  </DropdownMenuItem>

                  {team.status !== "archived" && onArchive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onArchive(team)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive team
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

