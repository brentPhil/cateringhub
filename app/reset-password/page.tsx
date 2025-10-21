import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Suspense fallback={<ResetPasswordPageSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

function ResetPasswordPageSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

