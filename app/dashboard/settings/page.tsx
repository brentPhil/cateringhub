"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfileForm } from "./edit-profile-form";
import { getInitials, getAvatarUrl } from "@/lib/utils/avatar";
import { useQueryState, parseAsStringLiteral } from "nuqs";

import {
  useUser,
  useProfile,
  useUserRole,
  useRolePermissions,
  useProviderRolePermissions,
} from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

// Define valid tab values
const TABS = ["profile", "account", "permissions"] as const;

export default function SettingsPage() {
  // Use TanStack Query hooks for data fetching
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: userRoleData, isLoading: isUserRoleLoading } = useUserRole();
  const { data: rolePermissions = [] } = useRolePermissions();
  const { data: providerRolePermissions = [] } = useProviderRolePermissions();

  // Use nuqs to manage the active tab in the URL
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("profile")
  );

  // Calculate overall loading state
  const isLoading = isUserLoading || isProfileLoading || isUserRoleLoading;

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
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
          {userRoleData?.role === "admin" && (
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <EditProfileForm
                user={user as User | null}
                profile={profile || null}
              />
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
                      <Typography variant="smallText">
                        {userRoleData?.role || "user"}
                        {userRoleData?.role === "catering_provider" &&
                          userRoleData?.provider_role &&
                          ` (${userRoleData.provider_role})`}
                      </Typography>
                    </div>
                    {userRoleData?.role === "catering_provider" &&
                      userRoleData?.provider_role && (
                        <div className="flex justify-between">
                          <Typography
                            variant="smallText"
                            className="text-muted-foreground"
                          >
                            Provider Type
                          </Typography>
                          <Typography variant="smallText">
                            {userRoleData.provider_role}
                          </Typography>
                        </div>
                      )}
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

                {userRoleData?.role === "admin" && (
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

            {userRoleData?.role !== "admin" && (
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
          {userRoleData?.role === "admin" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            Permission
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rolePermissions?.map((rp, index) => (
                          <tr key={index} className="border-b border-border">
                            <td className="px-4 py-3 text-sm">{rp.role}</td>
                            <td className="px-4 py-3 text-sm">
                              {rp.permission}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Catering Provider Sub-Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            Provider Role
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            Permission
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerRolePermissions?.map((prp, index) => (
                          <tr key={index} className="border-b border-border">
                            <td className="px-4 py-3 text-sm">
                              {prp.provider_role}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {prp.permission}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
