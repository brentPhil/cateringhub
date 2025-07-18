import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, ArrowLeft } from "lucide-react";

export default function ProviderDashboardPlaceholder() {
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
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Provider Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Typography variant="lead">
                You&apos;re already a catering provider!
              </Typography>
              <Typography variant="mutedText">
                This is a placeholder page. The full provider dashboard with
                advanced features is coming soon.
              </Typography>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/provider/dashboard/profile">View Profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/onboarding/provider">View Onboarding</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
