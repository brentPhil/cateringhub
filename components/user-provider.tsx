"use client";

import React, { ReactNode, useMemo } from "react";
import { useUser } from "@/hooks/use-auth";
import { getAvatarUrl } from "@/lib/utils/avatar";
import {
  AuthErrorBoundary,
  AuthLoadingFallback,
} from "@/components/auth-error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <AuthErrorBoundary>
      <UserProviderInner>{children}</UserProviderInner>
    </AuthErrorBoundary>
  );
}

function UserProviderInner({ children }: { children: ReactNode }) {
  const { data: user, isLoading: isUserLoading, error: userError } = useUser();

  // Prepare user data for components
  const userData = useMemo(() => {
    if (!user) return null;
    const userName = user.profile?.full_name || user.email?.split("@")[0] || "User";
    return {
      id: user.id,
      name: userName,
      email: user.email || "",
      avatar: getAvatarUrl(user.profile?.avatar_url, userName),
    };
  }, [user]);

  const childrenWithProps = useMemo(() => {
    if (!userData) return children;
    return React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(
          child as React.ReactElement<{ user?: typeof userData }>,
          { user: userData }
        );
      }
      return child;
    });
  }, [children, userData]);

  // Handle loading state
  if (isUserLoading) {
    return <AuthLoadingFallback />;
  }

  // Handle error state with better error UI
  if (userError) {
    const error = userError;

    // Only log in development mode
    if (process.env.NODE_ENV === "development") {
      console.error("Error loading user data:", error);
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Failed to load user data. Please try refreshing the page or logging
            in again.
            {process.env.NODE_ENV === "development" && (
              <details className="mt-2">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-1 text-xs">{error?.message}</pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  // Clone children with user prop
  return <>{childrenWithProps}</>;
}
