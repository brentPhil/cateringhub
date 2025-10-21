"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Loader2,
  Lock,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/useToast";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Check if user has a valid session (from the password reset link)
  useEffect(() => {
    const checkAuth = async () => {
      console.log(
        "🔐 [Reset Password] ========== CHECKING AUTH SESSION =========="
      );
      console.log("🔄 [Reset Password] Getting session...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("📊 [Reset Password] Session check result:", {
        hasSession: !!session,
        hasError: !!sessionError,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at,
      });

      if (sessionError) {
        console.error("❌ [Reset Password] Session error:", sessionError);
        console.error(
          "❌ [Reset Password] Error message:",
          sessionError.message
        );
      }

      if (!session) {
        console.error("❌ [Reset Password] No active session found!");
        console.error(
          "❌ [Reset Password] User needs to request a new password reset link"
        );
        setError(
          "Invalid or expired password reset session. Please request a new password reset link."
        );
        setIsAuthenticated(false);
      } else {
        console.log("✅ [Reset Password] Active session found!");
        console.log("👤 [Reset Password] User ID:", session.user?.id);
        console.log("📧 [Reset Password] User email:", session.user?.email);
        setIsAuthenticated(true);
      }

      setIsCheckingAuth(false);
      console.log(
        "🔐 [Reset Password] ========== AUTH CHECK COMPLETED =========="
      );
    };

    checkAuth();
  }, [supabase.auth]);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  // Reset password mutation
  const { mutate: resetPassword, isPending } = useMutation({
    mutationFn: async () => {
      console.log(
        "🔐 [Reset Password] ========== UPDATING PASSWORD =========="
      );
      console.log("🔄 [Reset Password] Validating password requirements...");

      if (!isPasswordValid) {
        console.error("❌ [Reset Password] Password validation failed!");
        console.error("❌ [Reset Password] Requirements:", {
          hasMinLength,
          hasUpperCase,
          hasLowerCase,
          hasNumber,
          hasSpecialChar,
        });
        throw new Error("Password does not meet all requirements");
      }
      console.log("✅ [Reset Password] Password meets all requirements");

      if (!passwordsMatch) {
        console.error("❌ [Reset Password] Passwords do not match!");
        throw new Error("Passwords do not match");
      }
      console.log("✅ [Reset Password] Passwords match");

      console.log("🔄 [Reset Password] Calling supabase.auth.updateUser()...");
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("❌ [Reset Password] Update user error:", error);
        console.error("❌ [Reset Password] Error message:", error.message);
        console.error("❌ [Reset Password] Error status:", error.status);
        throw error;
      }

      console.log("✅ [Reset Password] Password updated successfully!");
      console.log("📊 [Reset Password] Update response:", {
        hasUser: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email,
      });
      console.log(
        "🔐 [Reset Password] ========== PASSWORD UPDATE COMPLETED =========="
      );
    },
    onSuccess: () => {
      console.log(
        "🎉 [Reset Password] Success! Preparing to sign out and redirect..."
      );
      toast.success("Password updated successfully! Redirecting to login...");

      // Sign out the user and redirect to login
      setTimeout(async () => {
        console.log("🔄 [Reset Password] Signing out user...");
        await supabase.auth.signOut();
        console.log("✅ [Reset Password] User signed out");
        console.log("➡️  [Reset Password] Redirecting to login page...");
        router.push(
          "/login?message=Password+reset+successful.+Please+login+with+your+new+password."
        );
      }, 2000);
    },
    onError: (error: Error) => {
      console.error("💥 [Reset Password] Mutation error:", error);
      console.error("💥 [Reset Password] Error name:", error.name);
      console.error("💥 [Reset Password] Error message:", error.message);
      console.error("💥 [Reset Password] Error stack:", error.stack);
      setError(error.message);
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!password.trim()) {
      const errorMsg = "Password is required";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!isPasswordValid) {
      const errorMsg = "Password does not meet all requirements";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!passwordsMatch) {
      const errorMsg = "Passwords do not match";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    resetPassword();
  };

  if (isCheckingAuth) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <Typography variant="h3">Invalid reset link</Typography>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push("/forgot-password")}
            className="w-full"
          >
            Request new reset link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-1">
        <Typography variant="h3">Reset your password</Typography>
        <Typography variant="mutedText">
          Enter your new password below
        </Typography>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={isPending}
                autoComplete="new-password"
                autoFocus
              />
            </div>
          </div>

          {/* Password requirements */}
          {password && (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">
                Password must contain:
              </p>
              <div className="space-y-1">
                <PasswordRequirement
                  met={hasMinLength}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={hasUpperCase}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={hasLowerCase}
                  text="One lowercase letter"
                />
                <PasswordRequirement met={hasNumber} text="One number" />
                <PasswordRequirement
                  met={hasSpecialChar}
                  text="One special character"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
            {confirmPassword && (
              <PasswordRequirement
                met={passwordsMatch}
                text="Passwords match"
              />
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !isPasswordValid || !passwordsMatch}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );
}
