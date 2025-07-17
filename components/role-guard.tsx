"use client";

import React, { ReactNode } from "react";
import { useUser, useUserRole, useIsAdmin, useIsProvider, useIsProviderOwner, useIsProviderStaff, useHasRole, useHasProviderRole } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppRole, ProviderRoleType } from "@/types";

interface RoleGuardProps {
  role: AppRole;
  fallback?: ReactNode;
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function RoleGuard({
  role,
  fallback,
  children,
  requireAuth = true,
  redirectTo = "/login",
}: RoleGuardProps) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { value: hasRole, isLoading: isRoleLoading } = useHasRole(role);
  const router = useRouter();

  // Show loading state while checking authentication
  if (isUserLoading || isRoleLoading) {
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

  // Check if user has the required role
  if (!hasRole) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              <p>You don't have the required role ({role}) to access this content.</p>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  return <>{children}</>;
}

interface ProviderRoleGuardProps {
  providerRole: ProviderRoleType;
  fallback?: ReactNode;
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProviderRoleGuard({
  providerRole,
  fallback,
  children,
  requireAuth = true,
  redirectTo = "/login",
}: ProviderRoleGuardProps) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { value: hasProviderRole, isLoading: isRoleLoading } = useHasProviderRole(providerRole);
  const router = useRouter();

  // Show loading state while checking authentication
  if (isUserLoading || isRoleLoading) {
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

  // Check if user has the required provider role
  if (!hasProviderRole) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              <p>You don't have the required provider role ({providerRole}) to access this content.</p>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Convenience guard components for specific roles
export function AdminGuard({ children, fallback, requireAuth = true, redirectTo = "/login" }: {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}) {
  return (
    <RoleGuard
      role="admin"
      fallback={fallback}
      requireAuth={requireAuth}
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

export function ProviderGuard({ children, fallback, requireAuth = true, redirectTo = "/login" }: {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}) {
  return (
    <RoleGuard
      role="catering_provider"
      fallback={fallback}
      requireAuth={requireAuth}
      redirectTo={redirectTo}
    >
      {children}
    </RoleGuard>
  );
}

export function ProviderOwnerGuard({ children, fallback, requireAuth = true, redirectTo = "/login" }: {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}) {
  return (
    <ProviderRoleGuard
      providerRole="owner"
      fallback={fallback}
      requireAuth={requireAuth}
      redirectTo={redirectTo}
    >
      {children}
    </ProviderRoleGuard>
  );
}

export function ProviderStaffGuard({ children, fallback, requireAuth = true, redirectTo = "/login" }: {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}) {
  return (
    <ProviderRoleGuard
      providerRole="staff"
      fallback={fallback}
      requireAuth={requireAuth}
      redirectTo={redirectTo}
    >
      {children}
    </ProviderRoleGuard>
  );
}

// Multi-role guard that allows access if user has any of the specified roles
interface MultiRoleGuardProps {
  roles: AppRole[];
  fallback?: ReactNode;
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function MultiRoleGuard({
  roles,
  fallback,
  children,
  requireAuth = true,
  redirectTo = "/login",
}: MultiRoleGuardProps) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  const router = useRouter();

  // Show loading state while checking authentication
  if (isUserLoading || isRoleLoading) {
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

  // Check if user has any of the required roles
  const hasAnyRole = userRole && roles.includes(userRole.role);
  if (!hasAnyRole) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              <p>You don't have any of the required roles ({roles.join(", ")}) to access this content.</p>
            </AlertDescription>
          </Alert>
        </div>
      )
    );
  }

  return <>{children}</>;
}
