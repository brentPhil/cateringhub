"use client";

import { ReactNode } from "react";
import { useUser, useProfile } from "@/hooks/use-auth";
import { getAvatarUrl } from "@/lib/utils/avatar";

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading: isUserLoading, error: userError } = useUser();
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfile();

  // Handle loading state
  if (isUserLoading || isProfileLoading) {
    return <div>Loading...</div>;
  }

  // Handle error state
  if (userError || profileError) {
    console.error("Error loading user data:", userError || profileError);
    return <div>Error loading user data</div>;
  }

  // If no user, don't render children
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
          return React.cloneElement(child, { user: userData });
        }
        return child;
      })}
    </>
  );
}
