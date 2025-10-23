"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
} from "lucide-react";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "wrong_account"
  >("loading");
  const [message, setMessage] = useState("");
  const [providerName, setProviderName] = useState("");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Redirect to login with the invitation URL preserved
    const returnUrl = `/invitations/accept?token=${token}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const acceptInvitation = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/invitations/accept?token=${token}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Accept the invitation
    try {
      console.log("🔄 Accepting invitation with token:", token);

      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      console.log("📡 Response status:", response.status);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (!response.ok) {
        // Check for email mismatch error (403 Forbidden)
        if (response.status === 403) {
          setStatus("wrong_account");
          setMessage(
            data.error?.message ||
              "This invitation is not valid for your account."
          );
          return;
        }

        throw new Error(data.error?.message || "Failed to accept invitation");
      }

      setStatus("success");
      setProviderName(data.data?.provider?.name || "the team");
      setMessage("Invitation accepted successfully!");

      // Redirect to dashboard
      setTimeout(() => {
        const providerId = data.data?.provider?.id;
        router.push(
          providerId ? `/dashboard?provider=${providerId}` : "/dashboard"
        );
      }, 2000);
    } catch (error) {
      console.error("❌ Error accepting invitation:", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    }
  }, [token, router]);

  useEffect(() => {
    acceptInvitation();
  }, [acceptInvitation]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            {status === "loading" && "Processing your invitation..."}
            {status === "success" && "Welcome aboard!"}
            {status === "error" && "Something went wrong"}
            {status === "wrong_account" && "Invalid invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center space-y-2">
                <p className="font-medium">{message}</p>
                {providerName && (
                  <p className="text-sm text-muted-foreground">
                    You are now a member of {providerName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Redirecting...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <XCircle className="h-12 w-12 text-destructive" />
                <div className="text-center space-y-2">
                  <p className="font-medium text-destructive">
                    Failed to accept invitation
                  </p>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                >
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}

          {status === "wrong_account" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Invalid invitation</AlertTitle>
                <AlertDescription className="mt-2">
                  {message} You may need to sign out and sign in with a
                  different account.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={handleSignOut} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
