"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useAuthInfo } from "@/hooks/use-auth";

function NavigationSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-9 w-16 rounded bg-muted animate-pulse" />
      <div className="h-9 w-20 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function LandingNavigation() {
  const { user, isProvider, isLoading } = useAuthInfo();

  let rightContent: React.ReactNode;

  if (isLoading) {
    rightContent = <NavigationSkeleton />;
  } else if (user) {
    rightContent = (
      <div className="flex items-center gap-4">
        {!isProvider && (
          <>
            <Button variant="outline" asChild>
              <Link href="/home">Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/onboarding/provider">Become a Provider</Link>
            </Button>
          </>
        )}
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    );
  } else {
    rightContent = (
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/onboarding/provider">Become a Provider</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <header className="border-b border-border">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6" />
          <Typography as="span" variant="h5">
            CateringHub
          </Typography>
        </Link>
        {rightContent}
      </div>
    </header>
  );
}
