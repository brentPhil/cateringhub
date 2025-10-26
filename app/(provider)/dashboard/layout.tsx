import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { SiteHeader } from "./components/site-header";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify user has an active provider membership
  const { data: membership, error: membershipError } = await supabase
    .from("provider_members")
    .select("id, provider_id, user_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // If user doesn't have an active provider membership, redirect to onboarding
  if (membershipError || !membership) {
    redirect("/onboarding/provider/flow");
  }

  // Get sidebar state from cookie
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant="inset" />
      <SidebarInset className="h-screen">
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-auto relative">
          <div className="px-4 grid lg:p-6">
            <ScrollArea className="size-full">{children}</ScrollArea>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
