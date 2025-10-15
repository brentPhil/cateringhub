import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "403 - Forbidden | CateringHub",
  description: "You don't have permission to access this resource",
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <Typography variant="h1" className="text-6xl font-bold">
            403
          </Typography>
          <Typography variant="h3">Access forbidden</Typography>
          <Typography variant="mutedText" className="text-base">
            You don&apos;t have permission to access this resource. Please
            contact your administrator if you believe this is an error.
          </Typography>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
