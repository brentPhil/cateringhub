"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChefHat,
  ArrowLeft,
  Users,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUser, useIsProvider } from "@/hooks/use-auth";

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { isLoading: isProviderLoading } = useIsProvider();

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(
        "/login?redirect=" + encodeURIComponent("/onboarding/provider")
      );
    }
  }, [user, isUserLoading, router]);

  // Note: Redirect for existing providers is now handled by the BecomeProviderButton component
  // This allows existing providers to view the onboarding page if they navigate here directly

  // Show loading while checking authentication
  if (isUserLoading || isProviderLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <Typography variant="mutedText">Loading...</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            <Typography variant="h5">CateringHub</Typography>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Typography variant="h1" className="mb-4">
              Become a Catering Provider
            </Typography>
            <Typography variant="lead" className="max-w-2xl mx-auto mb-8">
              Join CateringHub as a catering provider and start managing your
              business with our comprehensive platform.
            </Typography>
          </div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Manage Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="mutedText">
                  Create and manage your catering services, set pricing, and
                  showcase your offerings to potential customers.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Track Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="mutedText">
                  Keep track of all your bookings, manage your calendar, and
                  never miss an important event.
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Customer Communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="mutedText">
                  Communicate directly with customers, respond to reviews, and
                  build lasting relationships.
                </Typography>
              </CardContent>
            </Card>
          </div>

          {/* Onboarding Steps Preview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What&apos;s Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <Typography variant="smallText" className="font-medium">
                      Business Information
                    </Typography>
                    <Typography variant="mutedText" className="text-sm">
                      Tell us about your catering business, upload your logo,
                      and provide your business address.
                    </Typography>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <Typography variant="smallText" className="font-medium">
                      Service Details
                    </Typography>
                    <Typography variant="mutedText" className="text-sm">
                      Describe your services, coverage areas, and upload sample
                      menus.
                    </Typography>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <Typography variant="smallText" className="font-medium">
                      Contact Information
                    </Typography>
                    <Typography variant="mutedText" className="text-sm">
                      Provide contact details and social media links for
                      customers to reach you.
                    </Typography>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center">
            <Button size="lg" className="mb-4" asChild>
              <Link href="/onboarding/provider/flow">
                Start Provider Onboarding
              </Link>
            </Button>
            <Typography variant="mutedText" className="text-sm">
              This will upgrade your account to a catering provider with owner
              permissions.
            </Typography>
          </div>
        </div>
      </main>
    </div>
  );
}
