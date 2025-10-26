import Link from "next/link";
import { ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

interface ProviderHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function ProviderHeader({
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: ProviderHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/provider/dashboard" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6" />
          <Typography variant="h5">CateringHub</Typography>
        </Link>
        {backHref && (
          <Button variant="ghost" asChild>
            <Link href={backHref} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
