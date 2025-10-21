"use client";

import { useRouter } from "next/navigation";
import { useCurrentMembership } from "@/hooks/use-membership";
import type { Database } from "@/database.types";
import { Loader2 } from "lucide-react";

type ProviderRole = Database["public"]["Enums"]["provider_role"];

interface RequireRoleProps {
  /**
   * Single role or array of allowed roles
   */
  roles: ProviderRole | ProviderRole[];

  /**
   * Optional provider ID to check membership in
   */
  providerId?: string;

  /**
   * Optional fallback component to show when unauthorized
   * If not provided, redirects to /403
   */
  fallback?: React.ReactNode;

  /**
   * Children to render when authorized
   */
  children: React.ReactNode;

  /**
   * Optional loading component
   */
  loadingComponent?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 * Shows loading state while checking membership
 * Redirects to /403 or shows fallback if unauthorized
 */
export function RequireRole({
  roles,
  providerId,
  fallback,
  children,
  loadingComponent,
}: RequireRoleProps) {
  const router = useRouter();
  const { data: membership, isLoading } = useCurrentMembership(providerId);

  // Show loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    );
  }

  // Check if user has membership
  if (!membership) {
    if (fallback) {
      return <>{fallback}</>;
    }
    router.push("/403");
    return null;
  }

  // Check if user has required role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const hasRequiredRole = allowedRoles.includes(membership.role);

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    router.push("/403");
    return null;
  }

  // User is authorized, render children
  return <>{children}</>;
}

/**
 * Higher-Order Component for page-level role protection
 *
 * @example
 * ```tsx
 * const ProtectedPage = withRequireRole(MyPage, ['owner', 'admin']);
 * export default ProtectedPage;
 * ```
 */
export function withRequireRole<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: ProviderRole | ProviderRole[],
  options?: {
    providerId?: string;
    fallback?: React.ReactNode;
    loadingComponent?: React.ReactNode;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <RequireRole
        roles={allowedRoles}
        providerId={options?.providerId}
        fallback={options?.fallback}
        loadingComponent={options?.loadingComponent}
      >
        <Component {...props} />
      </RequireRole>
    );
  };
}
