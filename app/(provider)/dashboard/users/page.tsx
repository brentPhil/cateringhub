"use client";

import { useRouter } from "next/navigation";
import { useUsers, useRefreshSession, useAuthInfo } from "@/hooks/use-auth";
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
import { Loader2, AlertCircle, Users, RefreshCw, Bug } from "lucide-react";
import { useEffect, useCallback } from "react";
import {
  debugJwtToken,
  forceJwtRefresh,
  testSupabaseConnection,
} from "@/app/auth/actions";
import { IS_DEV } from "@/lib/constants";

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
  const {
    user,
    role: userRole,
    isAdmin,
    isLoading: authLoading,
    error: authError,
  } = useAuthInfo();
  const refreshSession = useRefreshSession();
  const { data: users = [], isLoading, error } = useUsers();
  const showSessionRefresh =
    !authLoading &&
    user &&
    userRole === "admin" &&
    isAdmin === true &&
    (error?.message?.includes("403") ||
      (error as { code?: string })?.code === "42501" ||
      error?.message?.toLowerCase().includes("permission denied"));

  const handleDebugJwt = useCallback(async () => {
    if (IS_DEV) console.log("🔍 Debug JWT Token clicked");
    await debugJwtToken();
  }, []);

  const handleForceRefresh = useCallback(async () => {
    if (IS_DEV) console.log("🔄 Force JWT Refresh clicked");
    const success = await forceJwtRefresh();
    if (success) {
      window.location.reload();
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (IS_DEV) console.log("🧪 Test Connection clicked");
    await testSupabaseConnection();
  }, []);


  // Redirect if user doesn't have admin role (after loading is complete)
  useEffect(() => {
    if (!authLoading && user && isAdmin === false) {
      router.push("/dashboard");
    }
  }, [authLoading, user, isAdmin, router]);

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

  // Show access denied if user doesn't have admin role
  if (user && isAdmin === false) {
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
            You don&apos;t have admin access to view users. Please contact an
            administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <Typography variant="h3">Users Management</Typography>
        </div>

        {/* Debug Tools - Only show for admin users */}
        {userRole === "admin" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDebugJwt}>
              <Bug className="h-4 w-4 mr-2" />
              Debug JWT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
            >
              🧪 Test Connection
            </Button>
          </div>
        )}
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

      {error || authError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message ||
              (authError ? String(authError) : "") ||
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
