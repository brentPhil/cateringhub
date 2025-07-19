"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuthInfo } from "@/hooks/use-auth";

interface BecomeProviderButtonProps {
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  children?: React.ReactNode;
}

export function BecomeProviderButton({ 
  size = "lg", 
  variant = "default",
  className,
  children = "Become a Provider"
}: BecomeProviderButtonProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const { user, isProvider, isLoading: authLoading } = useAuthInfo();

  const handleClick = async () => {
    setIsNavigating(true);

    try {
      // Wait for auth checks to complete if still loading
      if (authLoading) {
        // Let the loading states resolve
        return;
      }

      // Case 1: User is not authenticated
      if (!user) {
        const redirectUrl = encodeURIComponent("/onboarding/provider");
        router.push(`/login?redirect=${redirectUrl}`);
        return;
      }

      // Case 2: User is authenticated but not a provider
      if (!isProvider) {
        router.push("/onboarding/provider");
        return;
      }

      // Case 3: User is authenticated and already a provider
      router.push("/provider/dashboard");
    } finally {
      setIsNavigating(false);
    }
  };

  const isLoading = authLoading || isNavigating;

  return (
    <Button 
      size={size} 
      variant={variant}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
