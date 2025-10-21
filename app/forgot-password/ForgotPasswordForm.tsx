"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Loader2,
  Mail,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/useToast";
import { forgotPasswordSchema } from "@/lib/validations";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Reset password mutation
  const { mutate: sendResetEmail, isPending } = useMutation({
    mutationFn: async () => {
      console.log("🔐 [Forgot Password] Starting password reset flow...");
      console.log("📧 [Forgot Password] Email:", email);

      // Validate email
      const validation = forgotPasswordSchema.safeParse({ email });
      if (!validation.success) {
        console.error(
          "❌ [Forgot Password] Validation failed:",
          validation.error.errors[0].message
        );
        throw new Error(validation.error.errors[0].message);
      }
      console.log("✅ [Forgot Password] Email validation passed");

      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      console.log("🔗 [Forgot Password] Redirect URL:", redirectUrl);
      console.log(
        "🌐 [Forgot Password] Window origin:",
        window.location.origin
      );
      console.log(
        "🌐 [Forgot Password] NEXT_PUBLIC_SITE_URL:",
        process.env.NEXT_PUBLIC_SITE_URL
      );

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("❌ [Forgot Password] Supabase error:", error);
        console.error("❌ [Forgot Password] Error message:", error.message);
        console.error("❌ [Forgot Password] Error status:", error.status);
        throw error;
      }

      console.log("✅ [Forgot Password] Reset email sent successfully");
      console.log("📨 [Forgot Password] Response data:", data);
    },
    onSuccess: () => {
      const successMessage = "Check your email for password reset instructions";
      console.log("🎉 [Forgot Password] Success! Email sent.");
      setSuccess(successMessage);
      setError(null);
      toast.success(successMessage);
      // Clear email field
      setEmail("");
    },
    onError: (error: Error) => {
      console.error("💥 [Forgot Password] Mutation error:", error);
      console.error("💥 [Forgot Password] Error name:", error.name);
      console.error("💥 [Forgot Password] Error message:", error.message);
      console.error("💥 [Forgot Password] Error stack:", error.stack);
      setError(error.message);
      setSuccess(null);
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!email.trim()) {
      const errorMsg = "Email is required";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    sendResetEmail();
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-1">
        <Typography variant="h3">Forgot password?</Typography>
        <Typography variant="mutedText">
          Enter your email address and we'll send you a link to reset your
          password
        </Typography>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isPending || !!success}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !!success}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="flex items-center justify-center w-full">
          <Link
            href="/login"
            className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
