"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import type { Database } from "@/database.types";

// Define types from database
type AppRole = Database["public"]["Enums"]["app_role"];
type ProviderRoleType = Database["public"]["Enums"]["provider_role_type"];

// Define types for our data
type UserRole = {
  role: AppRole;
  provider_role?: ProviderRoleType | null;
};

export type UserWithRoles = {
  id: string;
  full_name: string | null;
  updated_at: string | null;
  user_roles?: UserRole[];
};

// Helper function to format role display
const formatRoleDisplay = (userRole: UserRole) => {
  if (userRole.role === "catering_provider" && userRole.provider_role) {
    return `Catering Provider (${userRole.provider_role})`;
  }
  return userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1);
};

// Helper function to get role variant for Badge
const getRoleVariant = (
  userRole: UserRole
): "default" | "secondary" | "destructive" | "outline" => {
  if (userRole.role === "admin") {
    return "default";
  } else if (userRole.role === "catering_provider") {
    return "secondary";
  }
  return "outline";
};

export const usersColumns: ColumnDef<UserWithRoles>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="font-medium">{row.original.full_name || "N/A"}</span>
      );
    },
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      return <span className="font-mono text-xs">{row.original.id}</span>;
    },
  },
  {
    accessorKey: "user_roles",
    header: "Role",
    cell: ({ row }) => {
      const userRole = row.original.user_roles?.[0];
      return userRole ? (
        <Badge variant={getRoleVariant(userRole)}>
          {formatRoleDisplay(userRole)}
        </Badge>
      ) : (
        <Badge variant="outline">User</Badge>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3"
        >
          Last updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return row.original.updated_at
        ? new Date(row.original.updated_at).toLocaleDateString()
        : "N/A";
    },
  },
];
