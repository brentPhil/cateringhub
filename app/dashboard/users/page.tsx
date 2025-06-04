"use client";

import { useRouter } from "next/navigation";
import {
  useHasPermission,
  useUser,
  useUsers,
  useUserRole,
  useRefreshSession,
} from "@/hooks/use-auth";
import type { AppRole, ProviderRoleType } from "@/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Users, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

// Define types for our data
type UserRole = {
  role: AppRole;
  provider_role?: ProviderRoleType | null;
};

type UserWithRoles = {
  id: string;
  full_name: string | null;
  updated_at: string | null;
  user_roles?: UserRole[];
};

export default function UsersPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const refreshSession = useRefreshSession();
  const {
    value: canViewUsers,
    isLoading: permissionLoading,
    error: permissionError,
  } = useHasPermission("users.read");
  const { data: users = [], isLoading, error } = useUsers();
  const [showSessionRefresh, setShowSessionRefresh] = useState(false);

  // Check if user needs to refresh session (has admin role but database access fails)
  useEffect(() => {
    if (
      !userLoading &&
      !roleLoading &&
      !permissionLoading &&
      user &&
      userRole?.role === "admin" &&
      canViewUsers === true &&
      error?.message?.includes("403")
    ) {
      setShowSessionRefresh(true);
    }
  }, [
    userLoading,
    roleLoading,
    permissionLoading,
    user,
    userRole,
    canViewUsers,
    error,
  ]);

  // Redirect if user doesn't have permission (after loading is complete)
  useEffect(() => {
    if (!userLoading && !permissionLoading && user && canViewUsers === false) {
      router.push("/dashboard");
    }
  }, [userLoading, permissionLoading, user, canViewUsers, router]);

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

  // Show loading state while checking authentication
  if (userLoading || permissionLoading) {
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

  // Show access denied if user doesn't have permission
  if (user && canViewUsers === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <Typography variant="h3">Users Management</Typography>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to view users. Please contact an
            administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <Typography variant="h3">Users Management</Typography>
      </div>

      {/* Session Refresh Prompt */}
      {showSessionRefresh && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>JWT Token Refresh Required</AlertTitle>
          <AlertDescription>
            <div className="space-y-3 mt-2">
              <p>
                Your admin permissions are detected in the frontend, but the
                database is rejecting requests (403 Forbidden). This indicates
                your JWT token doesn&apos;t contain the updated admin claims.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Debug info:</strong> Frontend permissions work, but
                database RLS policies are blocking access. A session refresh
                will generate a new JWT token with the correct admin claims.
              </p>
              <Button
                onClick={() => {
                  refreshSession.mutate();
                  setShowSessionRefresh(false);
                }}
                variant="default"
                size="sm"
                disabled={refreshSession.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {refreshSession.isPending
                  ? "Refreshing JWT..."
                  : "Refresh Session & JWT"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error || permissionError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message ||
              (permissionError ? String(permissionError) : "") ||
              "Failed to load users"}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <Typography>Loading users...</Typography>
        </div>
      )}

      {/* Users table - only show when not loading */}
      {!isLoading && (
        <Table>
          <TableCaption>A list of all users in the system.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user: UserWithRoles) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || "N/A"}
                </TableCell>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell>
                  {user.user_roles?.[0] ? (
                    <Badge variant={getRoleVariant(user.user_roles[0])}>
                      {formatRoleDisplay(user.user_roles[0])}
                    </Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.updated_at
                    ? new Date(user.updated_at).toLocaleDateString()
                    : "N/A"}
                </TableCell>
              </TableRow>
            ))}

            {!users?.length && !isLoading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
