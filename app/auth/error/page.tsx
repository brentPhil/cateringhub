import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AuthErrorPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams;
  const errorMessage = params.message
    ? decodeURIComponent(params.message)
    : "There was an error with the authentication process. This could be due to an expired or invalid link.";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Authentication error
          </CardTitle>
          <CardDescription>Unable to complete authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Request new password reset</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
