import Link from "next/link";
import { LandingNavigation } from "@/components/landing-navigation";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";

export default function UserHomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavigation />
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <Typography variant="h2" className="mb-6">
          Discover Local Catering Providers
        </Typography>
        <Typography variant="lead" className="max-w-2xl mb-8">
          Browse nearby catering services and book your next event with ease.
        </Typography>
        <div className="flex gap-4 flex-col sm:flex-row">
          <Button asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </main>
      <footer>
        <Separator />
        <div className="container mx-auto px-4 py-6 text-center">
          <Typography variant="mutedText">
            &copy; {new Date().getFullYear()} CateringHub. All rights reserved.
          </Typography>
        </div>
      </footer>
    </div>
  );
}
