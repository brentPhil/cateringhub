"use client";

import React, { ReactNode } from "react";
import { useHasPermission, useUser } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppPermission } from "@/types";

interface PermissionGuardProps {
  permission: AppPermission;
  fallback?: ReactNode;
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function PermissionGuard({
  permission,
  fallback,
  children,
  requireAuth = true,
  redirectTo = "/login",
}: PermissionGuardProps) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const hasPermission = useHasPermission(permission);
  const router = useRouter();

  // Show loading state while checking authentication
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is authenticated (if required)
  if (requireAuth && !user) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert className="max-w-md">
            <LogIn className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>You need to be logged in to access this content.</p>
              <Button
                onClick={() => router.push(redirectTo)}
                className="w-full"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  // Check if user has the required permission
  if (!hasPermission) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>You don&apos;t have permission to access this content.</p>
              <p className="text-sm text-muted-foreground">
                Required permission:{" "}
                <code className="bg-muted px-1 rounded">{permission}</code>
              </p>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Role-based guard component
interface RoleGuardProps {
  roles: string[];
  fallback?: ReactNode;
  children: ReactNode;
  requireAuth?: boolean;
}

export function RoleGuard({
  fallback,
  children,
  requireAuth = true,
}: RoleGuardProps) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const router = useRouter();

  // Show loading state while checking authentication
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is authenticated (if required)
  if (requireAuth && !user) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert className="max-w-md">
            <LogIn className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>You need to be logged in to access this content.</p>
              <Button onClick={() => router.push("/login")} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  // For role checking, we would need to implement useUserRole hook usage
  // For now, we'll allow access (this can be enhanced later)
  return <>{children}</>;
}

// Note: Multi-permission guards are complex due to React hooks rules
// For now, we recommend using multiple single PermissionGuard components
// or creating custom hooks for specific permission combinations

// TODO: Implement multi-permission guards using custom hooks
// Example usage:
// const hasAllPermissions = useMultiplePermissions(['users.read', 'users.write'], 'all');
// const hasAnyPermission = useMultiplePermissions(['users.read', 'settings.read'], 'any');
