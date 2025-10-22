"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfileForm } from "./edit-profile-form";
import { getInitials, getAvatarUrl } from "@/lib/utils/avatar";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthInfo } from "@/hooks/use-auth";
import { DataTable } from "@/components/ui/data-table";
import { permissionsColumns, type RolePermission } from "./permissions-columns";

// Define valid tab values
const TABS = ["profile", "account", "permissions"] as const;

// Custom hook for role permissions using TanStack Query directly
function useRolePermissions(enabled: boolean = true) {
  const supabase = createClient();

  return useQuery<RolePermission[]>({
    queryKey: ["role_permissions"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("id, role, permission, created_at")
        .order("role", { ascending: true })
        .order("permission", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export default function SettingsPage() {
  const {
    user,
    role: userRole,
    isAdmin,
    isLoading: authLoading,
  } = useAuthInfo();

  // Only load role permissions if user is admin to avoid unnecessary queries
  const { data: rolePermissions, isLoading: permissionsLoading } =
    useRolePermissions(isAdmin);

  // Use nuqs to manage the active tab in the URL
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("profile")
  );

  // Derive loading state and profile from hooks
  const isLoading = authLoading || (isAdmin && permissionsLoading);
  const profile = user?.profile || null;

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <Typography>Loading settings...</Typography>
        </div>
      </div>
    );
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as (typeof TABS)[number]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          {userRole === "admin" && (
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <EditProfileForm user={user || null} profile={profile || null} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={getAvatarUrl(
                      profile?.avatar_url,
                      profile?.full_name || user?.email || ""
                    )}
                    alt={profile?.full_name || user?.email || ""}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(profile?.full_name || user?.email || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.full_name || user?.email}</CardTitle>
                  <Typography variant="mutedText">{user?.email}</Typography>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="smallText" className="font-medium">
                    Account Information
                  </Typography>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Role
                      </Typography>
                      <Typography variant="smallText">{userRole}</Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Email
                      </Typography>
                      <Typography variant="smallText">{user?.email}</Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Last Sign In
                      </Typography>
                      <Typography variant="smallText">
                        {user?.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleString()
                          : "N/A"}
                      </Typography>
                    </div>
                    <div className="flex justify-between">
                      <Typography
                        variant="smallText"
                        className="text-muted-foreground"
                      >
                        Created At
                      </Typography>
                      <Typography variant="smallText">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleString()
                          : "N/A"}
                      </Typography>
                    </div>
                  </div>
                </div>

                {userRole === "admin" && (
                  <div>
                    <Typography variant="smallText" className="font-medium">
                      Advanced Information
                    </Typography>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          User ID
                        </Typography>
                        <Typography
                          variant="smallText"
                          className="font-mono text-xs"
                        >
                          {user?.id}
                        </Typography>
                      </div>
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          Email Confirmed
                        </Typography>
                        <Typography variant="smallText">
                          {user?.email_confirmed_at ? "Yes" : "No"}
                        </Typography>
                      </div>
                      <div className="flex justify-between">
                        <Typography
                          variant="smallText"
                          className="text-muted-foreground"
                        >
                          Auth Provider
                        </Typography>
                        <Typography variant="smallText">
                          {user?.app_metadata?.provider || "email"}
                        </Typography>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {userRole !== "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Typography variant="mutedText">
                    You need admin privileges to access these settings.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          {userRole === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Role permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={permissionsColumns}
                  data={rolePermissions || []}
                  searchKey="role"
                  searchPlaceholder="Filter by role..."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
