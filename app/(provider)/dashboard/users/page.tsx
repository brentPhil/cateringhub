"use client";

import { useRouter } from "next/navigation";
import { useUsers, useAuthInfo } from "@/hooks/use-auth";
import { Typography } from "@/components/ui/typography";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { usersColumns } from "./users-columns";

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthInfo();
  const { data: users = [], isLoading, error } = useUsers();

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <Typography variant="h3">Users Management</Typography>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <Typography>Loading...</Typography>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <Typography variant="h3">Users Management</Typography>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load users"}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Users table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <Typography>Loading users...</Typography>
        </div>
      ) : (
        <DataTable
          columns={usersColumns}
          data={users || []}
          searchKey="full_name"
          searchPlaceholder="Filter by name..."
        />
      )}
    </div>
  );
}
