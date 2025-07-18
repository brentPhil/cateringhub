"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Loader2,
  Mail,
  User,
  Lock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/useToast";

export default function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null
  );
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Password validation
  const isPasswordValid = password.length >= 8;
  const passwordFeedback =
    !password || isPasswordValid
      ? null
      : "Password must be at least 8 characters";

  // Email/Password signup mutation
  const { mutate: signUp, isPending: isSignupPending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const successMessage = "Check your email for the confirmation link.";
      setSuccess(successMessage);
      toast.success(successMessage);
      // Clear form
      setFullName("");
      setEmail("");
      setPassword("");
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error(error.message);
    },
  });

  // Google signup mutation
  const { mutate: signupWithGoogle, isPending: isGooglePending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "profile email", // Request access to profile info including image
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error(error.message);
    },
  });

  // Facebook signup mutation
  const { mutate: signupWithFacebook, isPending: isFacebookPending } =
    useMutation({
      mutationFn: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        return data;
      },
      onError: (error: Error) => {
        setError(error.message);
        toast.error(error.message);
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!fullName.trim()) {
      setError("Full name is required");
      toast.error("Full name is required");
      return;
    }

    if (!email.trim()) {
      setError("Email is required");
      toast.error("Email is required");
      return;
    }

    if (!isPasswordValid) {
      setError("Password must be at least 8 characters");
      toast.error("Password must be at least 8 characters");
      return;
    }

    setError(null);
    signUp();
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center space-y-1">
        <Typography variant="h3">Create an Account</Typography>
        <Typography variant="mutedText">
          Sign up to get started with CateringHub
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

        <div className="flex flex-col space-y-4">
          {/* Google Sign Up - Primary authentication method */}
          <Button
            variant="outline"
            onClick={() => signupWithGoogle()}
            disabled={
              isGooglePending ||
              isSignupPending ||
              isFacebookPending ||
              !!success
            }
            className="flex items-center justify-center gap-2 w-full h-10"
            aria-label="Sign up with Google"
          >
            {isGooglePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
            )}
            {isGooglePending ? "Signing up..." : "Sign up with Google"}
          </Button>

          {/* Facebook Sign Up */}
          <Button
            variant="outline"
            onClick={() => signupWithFacebook()}
            disabled={
              isFacebookPending ||
              isSignupPending ||
              isGooglePending ||
              !!success
            }
            className="flex items-center justify-center gap-2 w-full h-10"
            aria-label="Sign up with Facebook"
          >
            {isFacebookPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  fill="#1877F2"
                />
              </svg>
            )}
            {isFacebookPending ? "Signing up..." : "Sign up with Facebook"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  placeholder="John Doe"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className={`pl-10 ${
                    passwordFeedback ? "border-destructive" : ""
                  }`}
                  aria-invalid={!!passwordFeedback}
                />
              </div>
              {passwordFeedback && (
                <p className="text-destructive text-xs mt-1">
                  {passwordFeedback}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 8 characters
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={
              isSignupPending ||
              isGooglePending ||
              isFacebookPending ||
              !!success
            }
            className="w-full h-10"
          >
            {isSignupPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <Typography variant="smallText">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </Typography>
      </CardFooter>
    </Card>
  );
}
