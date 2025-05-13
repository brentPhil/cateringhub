import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            <Typography variant="h5">CateringHub</Typography>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <Typography variant="h2" className="mb-6">
          Welcome to CateringHub
        </Typography>
        <Typography variant="lead" className="max-w-2xl mb-8">
          The complete management solution for catering businesses. Streamline
          operations, manage inventory, and delight your customers.
        </Typography>
        <div className="flex gap-4 flex-col sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
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
