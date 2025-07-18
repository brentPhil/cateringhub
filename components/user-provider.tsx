"use client";

import React, { ReactNode } from "react";
import { useUser, useProfile } from "@/hooks/use-auth";
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
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfile();

  // Handle loading state
  if (isUserLoading || isProfileLoading) {
    return <AuthLoadingFallback />;
  }

  // Handle error state with better error UI
  if (userError || profileError) {
    const error = userError || profileError;

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

  // If no user, don't render children (user is not authenticated)
  if (!user) {
    return null;
  }

  // Prepare user data for components
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const userData = {
    id: user.id,
    name: userName,
    email: user.email || "",
    avatar: getAvatarUrl(profile?.avatar_url, userName),
  };

  // Clone children with user prop
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ user?: typeof userData }>,
            {
              user: userData,
            }
          );
        }
        return child;
      })}
    </>
  );
}
