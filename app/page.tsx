import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { LandingNavigation } from "@/components/landing-navigation";
import { BecomeProviderButton } from "@/components/become-provider-button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavigation />

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <Typography variant="h2" className="mb-6">
          Welcome to CateringHub
        </Typography>
        <Typography variant="lead" className="max-w-2xl mb-8">
          The complete management solution for catering businesses. Streamline
          operations, manage inventory, and delight your customers.
        </Typography>
        <div className="flex gap-4 flex-col sm:flex-row">
          <BecomeProviderButton />
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
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
