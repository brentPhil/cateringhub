import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProviderHeader } from "@/components/provider-header";

export default async function ProviderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <ProviderHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
