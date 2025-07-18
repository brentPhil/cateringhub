import { Suspense } from "react";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={<SignupPageSkeleton />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}

function SignupPageSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="animate-pulse">
        <div className="bg-card rounded-lg shadow-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
