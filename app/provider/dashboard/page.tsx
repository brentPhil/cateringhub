import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat } from "lucide-react";

export default function ProviderDashboardPlaceholder() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
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
  );
}
