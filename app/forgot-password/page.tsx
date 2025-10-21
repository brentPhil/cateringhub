import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={<ForgotPasswordPageSkeleton />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

function ForgotPasswordPageSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

