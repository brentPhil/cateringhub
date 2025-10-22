"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import type { WorkerProfile } from "../hooks/use-worker-profiles";

interface WorkerProfileActionsProps {
  worker: WorkerProfile;
  onEdit: () => void;
  onDelete: () => void;
  onPromote?: () => void;
}

export function WorkerProfileActions({
  worker,
  onEdit,
  onDelete,
  onPromote,
}: WorkerProfileActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit profile
        </DropdownMenuItem>
        {onPromote && !worker.user_id && (
          <DropdownMenuItem onClick={onPromote}>
            <UserPlus className="mr-2 h-4 w-4" />
            Promote to team member
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

